import { Router, type Request, type Response } from 'express'
import { supabase, computeCertScore, getCertLevel, type Portrait } from '../lib/supabase.js'
import { logError } from '../lib/logger.js'

const router = Router()

// 计算能力保鲜度
function calculateFreshness(lastEvalDate: string | null): { score: number; label: string; color: string } {
  if (!lastEvalDate) return { score: 0, label: '未评估', color: '#87867f' }
  const days = Math.floor((Date.now() - new Date(lastEvalDate).getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 30) return { score: 100, label: '新鲜', color: '#4a8c6f' }
  if (days <= 60) return { score: 80, label: '正常', color: '#6dbf8e' }
  if (days <= 90) return { score: 60, label: '需更新', color: '#f59e0b' }
  return { score: 30, label: '过期', color: '#c96442' }
}

/** GET /api/profile/me — 获取当前登录用户的 profile */
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: '请先登录' })
    return
  }
  const token = authHeader.slice(7)
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const adminUrl = process.env.SUPABASE_URL || ''
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const admin = createClient(adminUrl, adminKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: { user } } = await admin.auth.getUser(token)
    if (!user?.id) {
      res.status(401).json({ success: false, error: '请先登录' })
      return
    }
    // Redirect to the same handler with the actual user ID
    req.params.id = user.id
    // Fall through to the /:id handler by calling it
    handleProfileById(req, res, user.id)
  } catch {
    res.status(401).json({ success: false, error: '请先登录' })
  }
})

/** Shared profile handler */
async function handleProfileById(req: Request, res: Response, userId: string): Promise<void> {

  // 1. Fetch profile basic info
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, title')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) {
    logError('profile', 'query failed', { error: profileError.message })
    res.status(500).json({ success: false, error: 'Failed to load profile' })
    return
  }

  if (!profile) {
    res.status(404).json({ success: false, error: 'Profile not found' })
    return
  }

  // 2. Fetch latest evaluation (portrait) — use highest score for consistency with leaderboard
  const { data: evaluation, error: evalError } = await supabase
    .from('evaluations')
    .select('portrait, cert_score, cert_level, trial_id, created_at')
    .eq('user_id', userId)
    .order('cert_score', { ascending: false })
    .limit(1)
    .maybeSingle()

  let portrait: Portrait | null = null
  let certScore: number | null = null
  let certLevel: ReturnType<typeof getCertLevel> = null

  if (evalError) {
    logError('profile', 'evaluation query failed', { error: evalError.message })
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
      logError('profile', 'certificate query failed', { error: certError.message })
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
    logError('profile', 'sessions query failed', { error: sessionsError.message })
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
      abilityFreshness: calculateFreshness(evaluation ? (evaluation.created_at as string) : null),
    },
  })
}

/** GET /api/profile/:id */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.id

  // UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(userId)) {
    res.status(400).json({ success: false, error: '无效的用户 ID 格式' })
    return
  }

  await handleProfileById(req, res, userId)
})

export default router
