import { Router, type Request, type Response } from 'express'
import { supabase, rowToPortrait, portraitToRow, type Portrait } from '../lib/supabase.js'
import { callGLM } from '../lib/glm.js'
import { logError } from '../lib/logger.js'

const router = Router()

// --- Default System Prompt (fallback when trial has no custom prompt) ---

const DEFAULT_SYSTEM_PROMPT = `你是 TalentX 人才试炼场的 AI 导师。你正在主持一场技术试炼。

你的职责：
1. 引导用户完成试炼任务，提出有挑战性的技术问题
2. 根据用户的回答质量进行引导，表现好时给予肯定，不足时提出追问
3. 对话风格：专业但不失亲和，用中文回复，适当使用代码示例
4. 试炼通常进行3-5轮对话后可以结束
5. 不要在回复中暴露评分细节，只做引导和互动
6. 根据用户的技术背景调整问题难度`

// --- Evaluation Prompt (独立评估调用) ---

const EVAL_SYSTEM_PROMPT = `你是一个严格的技术能力评估专家。你的任务是根据用户的对话表现，从六个维度评估其能力。

评估维度（0-100分）：
- curiosity（好奇心）：是否主动提问、深入探索未知领域、对新技术有热情
- reliability（靠谱）：回答是否准确、逻辑清晰、有条理、技术概念使用正确
- factChecking（事实洁癖）：是否验证假设、是否注意边界条件、是否区分事实与推测
- diverseThinking（多元化思维）：是否考虑多种方案、是否权衡利弊、是否有创新思路
- uncertaintyTolerance（忍受不确定性）：面对模糊问题是否从容、是否能给出合理假设并推进
- lowEgoHighDrive（低ego高自驱）：是否虚心接受建议、是否展现出学习和改进的动力

评分标准：
- 90-100：该维度表现卓越，远超预期
- 75-89：该维度表现优秀，达到高级工程师水平
- 60-74：该维度表现合格，达到基础要求
- 40-59：该维度表现不足，需要改进
- 0-39：该维度表现很差，或无法体现

你必须返回一个 JSON 对象，格式如下：
{"curiosity": 数字, "reliability": 数字, "factChecking": 数字, "diverseThinking": 数字, "uncertaintyTolerance": 数字, "lowEgoHighDrive": 数字, "reasoning": "简短说明评分理由（中文，不超过100字）"}

注意：只返回 JSON，不要返回其他内容。分数必须严格基于用户在对话中的实际表现。`

// --- Call GLM for evaluation ---

interface EvaluationResult extends Portrait {
  reasoning: string
}

async function evaluateConversation(
  userMessage: string,
  agentReply: string,
  conversationHistory: Array<{ role: string; content: string }>,
  currentScores: Portrait
): Promise<EvaluationResult> {
  // 构建评估上下文：最近几轮对话
  const recentTurns = conversationHistory.slice(-6) // 最近3轮
  const conversationText = recentTurns
    .map((m) => `${m.role === 'user' ? '用户' : '导师'}：${m.content}`)
    .join('\n\n')

  const evalMessages = [
    { role: 'system', content: EVAL_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `以下是用户在技术试炼中的对话记录：

${conversationText}

请根据用户在对话中的表现，评估其六维能力分数。注意：
1. 评分要严格、客观，不能因为用户说了客套话就给高分
2. 重点关注用户回答的技术深度、逻辑性和创新性
3. 如果用户回答肤浅或回避问题，相应维度应给低分
4. 当前累计分数是：${JSON.stringify(currentScores)}，你的评分应该在此基础上根据本轮表现调整（上下浮动不超过15分）`,
    },
  ]

  const result = await callGLM(evalMessages, {
    temperature: 0.3, // 评估用低温度保证一致性
    responseFormat: 'json',
  })

  // 解析 JSON
  const parsed = JSON.parse(result) as EvaluationResult

  // 确保分数在 0-100 范围内
  const dimensions: Array<keyof Portrait> = [
    'curiosity', 'reliability', 'factChecking', 'diverseThinking', 'uncertaintyTolerance', 'lowEgoHighDrive'
  ]

  for (const dim of dimensions) {
    if (typeof parsed[dim] !== 'number' || isNaN(parsed[dim])) {
      parsed[dim] = currentScores[dim] // fallback to current score
    }
    parsed[dim] = Math.max(0, Math.min(100, Math.round(parsed[dim])))
  }

  return parsed
}

// --- Fallback Response ---

function fallbackResponse(message: string): string {
  const lower = message.toLowerCase()
  if (/代码|code|技术|架构|bug|实现|api|函数/.test(lower)) {
    return '关于技术实现方面，我建议你可以从以下几个角度思考：\n\n1. 代码结构是否清晰，模块划分是否合理\n2. 错误处理和边界情况是否考虑充分\n3. 性能方面有没有可以优化的地方\n\n你可以把具体的代码片段发给我，我来帮你分析。'
  }
  return `你提到了「${message.slice(0, 20)}${message.length > 20 ? '...' : ''}」，这是一个很好的方向。\n\n在挑战过程中，我建议你多关注问题本身的核心难点，尝试从不同角度寻找解决方案。如果遇到困难，随时可以和我讨论。`
}

// --- Fallback evaluation (when GLM eval fails) ---

function fallbackEvaluation(currentScores: Portrait, message: string): EvaluationResult {
  // 简单的启发式规则：基于消息长度和技术关键词
  const techKeywords = /(api|react|vue|typescript|python|架构|性能|优化|算法|数据结构|测试|部署|docker|kubernetes|数据库|缓存|并发|异步|安全)/gi
  const hasTechDepth = techKeywords.test(message)
  const messageLength = message.length

  // 基础增量
  const baseInc = hasTechDepth ? 3 : 1
  const lengthBonus = Math.min(4, Math.floor(messageLength / 50)) // 长回答加分

  return {
    curiosity: Math.min(100, currentScores.curiosity + baseInc + (message.includes('?') || message.includes('？') ? 2 : 0)),
    reliability: Math.min(100, currentScores.reliability + baseInc + lengthBonus),
    factChecking: Math.min(100, currentScores.factChecking + baseInc),
    diverseThinking: Math.min(100, currentScores.diverseThinking + (hasTechDepth ? 3 : 1)),
    uncertaintyTolerance: Math.min(100, currentScores.uncertaintyTolerance + baseInc),
    lowEgoHighDrive: Math.min(100, currentScores.lowEgoHighDrive + baseInc),
    reasoning: 'AI评估不可用，使用启发式评分',
  }
}

// --- Chat Handler ---

/** POST /api/chat - SSE streaming chat */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { sessionId, message, guestMode } = req.body as { sessionId?: string; message?: string; guestMode?: boolean }

  if (!message) {
    res.status(400).json({ success: false, error: 'message is required' })
    return
  }

  // --- Input validation ---
  const trimmedMessage = message.trim()
  if (trimmedMessage.length === 0) {
    res.status(400).json({ success: false, error: '消息不能为空' })
    return
  }
  if (trimmedMessage.length > 2000) {
    res.status(400).json({ success: false, error: '消息过长，请控制在 2000 字以内' })
    return
  }

  // --- Guest mode: no DB, single-turn demo conversation ---
  if (guestMode || sessionId === 'demo-session') {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const demoMessages = [
      { role: 'system', content: DEFAULT_SYSTEM_PROMPT + '\n\n注意：这是未注册用户的体验对话，请给出简洁有深度的回答（150字以内），激发用户注册兴趣。' },
      { role: 'user', content: trimmedMessage },
    ]

    try {
      const reply = await callGLM(demoMessages, { temperature: 0.7 })
      const events: string[] = []
      for (const ch of reply) {
        events.push(`event: token\ndata: ${JSON.stringify({ token: ch })}\n\n`)
      }
      events.push(`event: done\ndata: ${JSON.stringify({ guestMode: true })}\n\n`)
      res.end(events.join(''))
    } catch {
      const fallback = '这是一个很好的问题！注册 TalentX 后，我可以进行更深入的评估，并生成你的专属能力画像。期待你的加入！'
      const events: string[] = []
      for (const ch of fallback) {
        events.push(`event: token\ndata: ${JSON.stringify({ token: ch })}\n\n`)
      }
      events.push(`event: done\ndata: ${JSON.stringify({ guestMode: true })}\n\n`)
      res.end(events.join(''))
    }
    return
  }

  if (!sessionId) {
    res.status(400).json({ success: false, error: 'sessionId is required' })
    return
  }

  // sessionId must be a UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(sessionId)) {
    res.status(400).json({ success: false, error: '无效的会话 ID' })
    return
  }

  // Load session from Supabase
  const { data: session, error: sessionError } = await supabase
    .from('trial_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionError) {
    logError('chat', 'session query failed', { error: sessionError.message })
    res.status(500).json({ success: false, error: 'Failed to load session' })
    return
  }

  if (!session) {
    res.status(404).json({ success: false, error: 'Session not found' })
    return
  }

  // Build state from DB row
  const messages: Array<{ role: string; content: string }> = Array.isArray(session.messages) ? session.messages : []
  let turnCount: number = session.turn_count ?? 0
  const scores: Portrait = rowToPortrait(session)

  // Load trial-specific system prompt
  let systemPrompt = DEFAULT_SYSTEM_PROMPT
  if (session.trial_id) {
    const { data: trial } = await supabase
      .from('trials')
      .select('system_prompt')
      .eq('id', session.trial_id)
      .maybeSingle()
    if (trial?.system_prompt) {
      systemPrompt = trial.system_prompt
    }
    // 追加 AI 角色人格指令
    const personaMap: Record<string, string> = {
      'ai-hackathon': 'tech-lead',
      'rag-system': 'mentor',
      'code-review': 'reviewer',
      'system-design': 'pm',
      'frontend-eng': 'reviewer',
      'debug-master': 'tech-lead',
      'api-design': 'pm',
    }
    const personaSuffixes: Record<string, string> = {
      'tech-lead': '\n\n你现在扮演 Marcus，一位严厉的 Tech Lead。你的风格是：直接、高压、追问细节。不要让用户轻易过关。',
      'mentor': '\n\n你现在扮演 Sarah，一位友善的 Mentor。你的风格是：温暖、鼓励、引导式。',
      'reviewer': '\n\n你现在扮演 David，一位挑剔的 Code Reviewer。你的风格是：逐行审查、关注边界条件。',
      'pm': '\n\n你现在扮演 Emma，一位务实的 Product Manager。你的风格是：关注用户价值、善用 trade-off 思维。',
    }
    const personaKey = personaMap[session.trial_id]
    if (personaKey && personaSuffixes[personaKey]) {
      systemPrompt += personaSuffixes[personaKey]
    }
  }

  // Add user message to history
  messages.push({ role: 'user', content: message })
  turnCount++

  // Build messages for GLM conversation
  const glmMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.slice(-20),
  ]

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.flushHeaders()

  // Step 1: Get agent reply from GLM
  let agentReply: string
  try {
    agentReply = await callGLM(glmMessages)
  } catch (err) {
    logError('chat', 'GLM conversation failed', { error: String(err) })
    agentReply = fallbackResponse(message)
  }

  // Add assistant reply to history
  messages.push({ role: 'assistant', content: agentReply })

  // Step 2: Get real evaluation from GLM (separate call)
  let evaluation: EvaluationResult
  try {
    evaluation = await evaluateConversation(message, agentReply, messages, scores)
    console.log(`[chat] AI evaluation: ${JSON.stringify(evaluation)}`)
  } catch (err) {
    logError('chat', 'GLM evaluation failed, using fallback', { error: String(err) })
    evaluation = fallbackEvaluation(scores, message)
  }

  // Apply EMA smoothing: blend new AI evaluation with accumulated score
  // ALPHA=0.35 gives weight to recent performance while preserving history
  const EMA_ALPHA = 0.35
  ;(Object.keys(scores) as Array<keyof Portrait>).forEach((key) => {
    scores[key] = Math.round(EMA_ALPHA * evaluation[key] + (1 - EMA_ALPHA) * scores[key])
  })

  // Persist updated state to database
  const { error: updateError } = await supabase
    .from('trial_sessions')
    .update({
      messages,
      turn_count: turnCount,
      ...portraitToRow(scores),
    })
    .eq('id', sessionId)

  if (updateError) {
    logError('chat', 'session update failed', { error: updateError.message })
  }

  // Build SSE events
  const events: string[] = []

  // Send each character as a token event
  for (const char of agentReply) {
    events.push(`data: ${JSON.stringify({ type: 'token', content: char })}\n\n`)
  }

  // Send evaluation event
  events.push(`data: ${JSON.stringify({ type: 'evaluation', ...scores })}\n\n`)

  events.push(`data: ${JSON.stringify({ type: 'done' })}\n\n`)

  res.end(events.join(''))
})

export default router
