import { Router, type Request, type Response } from 'express'
import { supabase } from '../lib/supabase.js'
import { getAuthenticatedUserId } from '../middleware/auth.js'

const router = Router()

interface Trial {
  id: string
  title: string
  description: string
  type: string
  difficulty: string
  duration: string
  participants: number
  status: string
}

/** GET /api/trials - list all active trials */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from('trials')
    .select('*')
    .eq('status', 'active')

  if (error) {
    console.error('[trials] query failed:', error.message)
    res.status(500).json({ success: false, error: 'Failed to load trials' })
    return
  }

  const trials: Trial[] = (data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    type: (t.tags ?? []).includes('代码审查') ? 'code_review' : 'hackathon',
    difficulty: t.difficulty,
    duration: `${t.duration_hours}小时`,
    participants: t.participant_count,
    status: t.status,
  }))

  res.json({ success: true, data: trials })
})

/** GET /api/trials/:id - single trial */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from('trials')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle()

  if (error) {
    console.error('[trials/:id] query failed:', error.message)
    res.status(500).json({ success: false, error: 'Failed to load trial' })
    return
  }

  if (!data) {
    res.status(404).json({ success: false, error: 'Trial not found' })
    return
  }

  const trial: Trial = {
    id: data.id,
    title: data.title,
    description: data.description,
    type: (data.tags ?? []).includes('代码审查') ? 'code_review' : 'hackathon',
    difficulty: data.difficulty,
    duration: `${data.duration_hours}小时`,
    participants: data.participant_count,
    status: data.status,
  }

  res.json({ success: true, data: trial })
})

/** POST /api/trials/:id/start - start a trial session */
router.post('/:id/start', async (req: Request, res: Response): Promise<void> => {
  const trialId = req.params.id
  const userId = await getAuthenticatedUserId(req)

  // Verify trial exists
  const { data: trial, error: trialError } = await supabase
    .from('trials')
    .select('id, title, status')
    .eq('id', trialId)
    .maybeSingle()

  if (trialError) {
    console.error('[trials/:id/start] trial query failed:', trialError.message)
    res.status(500).json({ success: false, error: 'Failed to load trial' })
    return
  }

  if (!trial) {
    res.status(404).json({ success: false, error: 'Trial not found' })
    return
  }

  // Require a user id (for testing phase, from header)
  if (!userId) {
    res.status(400).json({ success: false, error: 'x-user-id header is required' })
    return
  }

  // Check if user already has an in-progress session for this trial
  const { data: existing, error: existingError } = await supabase
    .from('trial_sessions')
    .select('id, messages, turn_count')
    .eq('user_id', userId)
    .eq('trial_id', trialId)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingError) {
    console.error('[trials/:id/start] existing session query failed:', existingError.message)
    res.status(500).json({ success: false, error: 'Failed to check existing session' })
    return
  }

  let sessionId: string
  let existingMessages: any[] = []
  let existingTurnCount = 0

  if (existing) {
    // Reuse existing in-progress session
    sessionId = existing.id
    existingMessages = Array.isArray(existing.messages) ? existing.messages : []
    existingTurnCount = existing.turn_count ?? 0
  } else {
    // Create a new session with default scores (50 across all dimensions)
    const { data: created, error: createError } = await supabase
      .from('trial_sessions')
      .insert({
        user_id: userId,
        trial_id: trialId,
        status: 'in_progress',
        scores_curiosity: 50,
        scores_reliability: 50,
        scores_fact_checking: 50,
        scores_diverse_thinking: 50,
        scores_uncertainty_tolerance: 50,
        scores_low_ego_high_drive: 50,
        turn_count: 0,
        messages: [],
      })
      .select('id')
      .single()

    if (createError || !created) {
      console.error('[trials/:id/start] create session failed:', createError?.message)
      res.status(500).json({ success: false, error: 'Failed to start session' })
      return
    }

    sessionId = created.id
  }

  res.json({
    success: true,
    data: {
      sessionId,
      messages: existingMessages,
      turnCount: existingTurnCount,
      greeting: existingMessages.length > 0
        ? ''
        : `欢迎参加「${trial.title}」！我是你的 AI 导师，有任何问题都可以随时问我。准备好了就开始吧！`,
    },
  })
})

export default router
