import { Router, type Request, type Response } from 'express'
import { supabase, computeCertScore, getCertLevel, type Portrait } from '../lib/supabase.js'

const router = Router()

/** GET /api/profile/:id */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.id

  // 1. Fetch profile basic info
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, title')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) {
    console.error('[profile] query failed:', profileError.message)
    res.status(500).json({ success: false, error: 'Failed to load profile' })
    return
  }

  if (!profile) {
    res.status(404).json({ success: false, error: 'Profile not found' })
    return
  }

  // 2. Fetch latest evaluation (portrait)
  const { data: evaluation, error: evalError } = await supabase
    .from('evaluations')
    .select('portrait, cert_score, cert_level, trial_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let portrait: Portrait | null = null
  let certScore: number | null = null
  let certLevel: ReturnType<typeof getCertLevel> = null

  if (evalError) {
    console.error('[profile] evaluation query failed:', evalError.message)
  } else if (evaluation && evaluation.portrait) {
    portrait = evaluation.portrait as Portrait
    certScore = evaluation.cert_score ?? computeCertScore(portrait)
    certLevel = evaluation.cert_level ?? getCertLevel(certScore)
  }

  // 3. Fetch certificate info
  let certification: { level: string; certScore: number; issuedAt: string } | null = null
  if (certLevel) {
    const { data: cert, error: certError } = await supabase
      .from('certificates')
      .select('level, cert_score, issued_at')
      .eq('user_id', userId)
      .eq('is_revoked', false)
      .order('issued_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (certError) {
      console.error('[profile] certificate query failed:', certError.message)
    } else if (cert) {
      certification = {
        level: cert.level,
        certScore: cert.cert_score,
        issuedAt: (cert.issued_at as string).slice(0, 10),
      }
    } else {
      certification = {
        level: certLevel,
        certScore: certScore ?? 0,
        issuedAt: evaluation ? (evaluation.created_at as string).slice(0, 10) : new Date().toISOString().slice(0, 10),
      }
    }
  }

  // 4. Fetch trial history
  const { data: sessions, error: sessionsError } = await supabase
    .from('trial_sessions')
    .select('id, trial_id, status, started_at, submitted_at')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })

  let trialHistory: Array<{ name: string; date: string; score: number }> = []
  if (sessionsError) {
    console.error('[profile] sessions query failed:', sessionsError.message)
  } else if (sessions && sessions.length > 0) {
    // Fetch trial titles for the sessions
    const trialIds = Array.from(new Set(sessions.map((s) => s.trial_id)))
    const { data: trials } = await supabase
      .from('trials')
      .select('id, title')
      .in('id', trialIds)

    const trialTitleMap = new Map((trials ?? []).map((t) => [t.id, t.title]))

    // Fetch evaluation scores per session
    const sessionIds = sessions.map((s) => s.id)
    const { data: evals } = await supabase
      .from('evaluations')
      .select('session_id, cert_score')
      .in('session_id', sessionIds)

    const evalScoreMap = new Map((evals ?? []).map((e) => [e.session_id, e.cert_score]))

    trialHistory = sessions
      .filter((s) => evalScoreMap.has(s.id))
      .map((s) => ({
        name: trialTitleMap.get(s.trial_id) ?? s.trial_id,
        date: ((s.submitted_at ?? s.started_at) as string).slice(0, 10),
        score: evalScoreMap.get(s.id) ?? 0,
      }))
  }

  res.json({
    success: true,
    data: {
      id: profile.id,
      name: profile.display_name || profile.username,
      avatar: profile.avatar_url,
      title: profile.title,
      bio: profile.bio,
      portrait,
      certScore,
      certLevel,
      certification,
      trialHistory,
    },
  })
})

export default router
