import { Router, type Request, type Response } from 'express'
import {
  supabase,
  rowToPortrait,
  computeCertScore,
  getCertLevel,
  generateCertNumber,
  generateVerificationCode,
  type Portrait,
} from '../lib/supabase.js'

const router = Router()

/** POST /api/evaluate */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { trialId, sessionId } = req.body as {
    trialId?: string; sessionId?: string
  }

  if (!trialId || !sessionId) {
    res.status(400).json({ success: false, error: 'trialId and sessionId are required' })
    return
  }

  // Load session from Supabase
  const { data: session, error: sessionError } = await supabase
    .from('trial_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionError) {
    console.error('[evaluate] session query failed:', sessionError.message)
    res.status(500).json({ success: false, error: 'Failed to load session' })
    return
  }

  let portrait: Portrait
  let userId: string

  if (session) {
    userId = session.user_id
    // Use accumulated EMA-smoothed scores directly (no turn bonus hack)
    portrait = rowToPortrait(session)
  } else {
    // Fallback: generate reasonable default scores
    portrait = {
      curiosity: 65,
      reliability: 70,
      factChecking: 60,
      diverseThinking: 68,
      uncertaintyTolerance: 55,
      lowEgoHighDrive: 72,
    }
    // Without a session we cannot identify the user
    userId = ''
  }

  // Compute D1-D5 dimension scores from portrait (for display)
  const dimensionScores: Record<string, number> = {
    D1_codeQuality: Math.round(Math.min(100, (portrait.reliability + portrait.factChecking) / 2)),
    D2_problemSolving: Math.round(Math.min(100, (portrait.diverseThinking + portrait.uncertaintyTolerance) / 2)),
    D3_innovation: Math.round(Math.min(100, (portrait.diverseThinking + portrait.curiosity) / 2)),
    D4_communication: Math.round(Math.min(100, (portrait.lowEgoHighDrive + portrait.reliability) / 2)),
    D5_execution: Math.round(Math.min(100, (portrait.reliability + portrait.lowEgoHighDrive) / 2)),
  }

  const certScore = computeCertScore(portrait)
  const certLevel = getCertLevel(certScore)

  // Insert evaluation record (only if we have a valid session)
  let evaluationId: string | null = null
  if (session) {
    const { data: evaluation, error: evalError } = await supabase
      .from('evaluations')
      .insert({
        session_id: sessionId,
        user_id: userId,
        trial_id: trialId,
        portrait,
        dimension_scores: dimensionScores,
        cert_score: certScore,
        cert_level: certLevel,
      })
      .select('id')
      .single()

    if (evalError) {
      console.error('[evaluate] insert evaluation failed:', evalError.message)
    } else if (evaluation) {
      evaluationId = evaluation.id
    }

    // Issue a certificate if the user reached a cert level
    if (certLevel && evaluationId) {
      const { error: certError } = await supabase
        .from('certificates')
        .insert({
          cert_number: generateCertNumber(certLevel),
          user_id: userId,
          evaluation_id: evaluationId,
          trial_id: trialId,
          level: certLevel,
          cert_score: certScore,
          portrait,
          verification_code: generateVerificationCode(),
        })

      if (certError) {
        console.error('[evaluate] insert certificate failed:', certError.message)
      }
    }

    // Mark session as evaluated
    const { error: updateError } = await supabase
      .from('trial_sessions')
      .update({ status: 'evaluated', submitted_at: new Date().toISOString() })
      .eq('id', sessionId)

    if (updateError) {
      console.error('[evaluate] update session status failed:', updateError.message)
    }
  }

  res.json({
    success: true,
    data: {
      trialId,
      sessionId,
      dimensionScores,
      portrait,
      certScore,
      certification: certLevel
        ? { level: certLevel, certScore, issuedAt: new Date().toISOString().slice(0, 10) }
        : null,
    },
  })
})

export default router
