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
  agentPersona?: AgentPersona
}

// AI 导师角色定义
interface AgentPersona {
  name: string          // 角色名称
  title: string         // 头衔
  avatar: string        // bootstrap icon class
  personality: string   // 性格描述（用于前端展示）
  systemPromptSuffix: string  // 附加到 system prompt 的角色指令
}

// 4 种 AI 角色映射
const AGENT_PERSONAS: Record<string, AgentPersona> = {
  'tech-lead': {
    name: 'Marcus',
    title: '严厉的 Tech Lead',
    avatar: 'bi-person-badge-fill',
    personality: '高压追问，不容敷衍，对技术细节锱铢必较',
    systemPromptSuffix: '\n\n你现在扮演 Marcus，一位严厉的 Tech Lead。你的风格是：直接、高压、追问细节。不要让用户轻易过关，对每个回答都要找到可以追问的点。',
  },
  'mentor': {
    name: 'Sarah',
    title: '友善的 Mentor',
    avatar: 'bi-emoji-smile',
    personality: '引导式提问，鼓励探索，善于发现闪光点',
    systemPromptSuffix: '\n\n你现在扮演 Sarah，一位友善的 Mentor。你的风格是：温暖、鼓励、引导式。先肯定用户的思考，再引导深入。',
  },
  'reviewer': {
    name: 'David',
    title: '挑剔的 Code Reviewer',
    avatar: 'bi-bug-fill',
    personality: '逐行审查，关注边界条件，对代码质量要求极高',
    systemPromptSuffix: '\n\n你现在扮演 David，一位挑剔的 Code Reviewer。你的风格是：逐行审查、关注边界条件、对命名规范和代码质量要求极高。',
  },
  'pm': {
    name: 'Emma',
    title: '务实的 Product Manager',
    avatar: 'bi-clipboard-data-fill',
    personality: '需求变更测试，关注用户价值，善于提出 trade-off 问题',
    systemPromptSuffix: '\n\n你现在扮演 Emma，一位务实的 Product Manager。你的风格是：关注用户价值、善用 trade-off 思维、偶尔抛出需求变更来测试应变能力。',
  },
}

// 每个试炼 ID 对应的角色映射
const TRIAL_PERSONA_MAP: Record<string, string> = {
  'ai-hackathon': 'tech-lead',
  'rag-system': 'mentor',
  'code-review': 'reviewer',
  'system-design': 'pm',
  'frontend-eng': 'reviewer',
  'debug-master': 'tech-lead',
  'api-design': 'pm',
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

  // 附加 AI 角色人格
  const personaKey = TRIAL_PERSONA_MAP[data.id] || 'mentor'
  trial.agentPersona = AGENT_PERSONAS[personaKey]

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
        : (() => {
            // 使用角色名称生成个性化开场白
            const personaKey = TRIAL_PERSONA_MAP[trialId] || 'mentor'
            const persona = AGENT_PERSONAS[personaKey]
            const mentorName = persona?.name || 'AI 导师'
            return `欢迎参加「${trial.title}」！我是${mentorName}，你的${persona?.title || '导师'}，有任何问题都可以随时问我。准备好了就开始吧！`
          })(),
    },
  })
})

export default router
