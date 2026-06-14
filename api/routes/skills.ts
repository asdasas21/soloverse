import { Router, type Request, type Response } from 'express'
import { supabase } from '../lib/supabase.js'
import { getAuthenticatedUserId } from '../middleware/auth.js'

const router = Router()

// ============================================================
// GLM API 调用（独立实现，不依赖 chat.ts）
// ============================================================

async function callGLM(
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; responseFormat?: 'text' | 'json' }
): Promise<string> {
  const apiKey = process.env.ZHIPU_API_KEY
  const apiBase = process.env.ZHIPU_API_BASE || 'https://open.bigmodel.cn/api/paas/v4'
  const model = process.env.ZHIPU_MODEL || 'glm-4-flash'

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: 2048,
  }

  // 智谱 AI 支持 JSON 模式
  if (options?.responseFormat === 'json') {
    body.response_format = { type: 'json_object' }
  }

  const res = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`GLM API error: ${res.status}`)
  }

  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> }
  return data.choices[0].message.content
}

// ============================================================
// Skill 执行核心逻辑
// ============================================================

/**
 * 执行 skill — 企业 Agent 调用的核心入口
 * 1. 查询用户最新评估（能力画像）
 * 2. 用 GLM 执行 skill 的实际逻辑
 * 3. 返回执行结果 + 评估上下文
 */
async function invokeSkill(skill: any, input: any, supabaseClient: typeof supabase) {
  // 1. 查询用户最新评估
  const { data: evaluation } = await supabaseClient
    .from('evaluations')
    .select('portrait, cert_score, cert_level')
    .eq('user_id', skill.user_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // 2. 构建 system prompt，注入协议的输出 schema 和评估维度
  const protocol = skill.protocol || {}
  const outputSchema = protocol.output_schema || {}
  const evalDimensions = protocol.evaluation_dimensions || []

  const skillPrompt = `你是一个能力验证 Skill。用户声称具备「${skill.title}」能力。
根据用户的能力画像：${JSON.stringify(evaluation?.portrait || {})}
执行以下任务：${skill.description}
${evalDimensions.length > 0 ? `重点考察维度：${evalDimensions.join(', ')}` : ''}
输入数据：${JSON.stringify(input)}
请按照协议定义的输出格式返回结果。输出格式必须符合：${JSON.stringify(outputSchema)}`

  // 3. 用 GLM 执行 skill 逻辑
  const result = await callGLM(
    [
      { role: 'system', content: skillPrompt },
      { role: 'user', content: JSON.stringify(input) },
    ],
    { temperature: 0.3, responseFormat: 'json' }
  )

  return {
    result: JSON.parse(result),
    evaluation: {
      certScore: evaluation?.cert_score,
      certLevel: evaluation?.cert_level,
    },
  }
}

/**
 * 根据 skill 生成 MCP tool 定义
 * 企业 Agent 通过 MCP 协议调用时使用的工具描述
 */
function buildMcpToolDefinition(skill: any) {
  const protocol = skill.protocol || {}
  return {
    name: `skill_${skill.id.replace(/-/g, '_').slice(0, 16)}`,
    description: skill.description,
    inputSchema: protocol.input_schema || {
      type: 'object',
      properties: {},
    },
  }
}

// ============================================================
// Skill CRUD 路由
// ============================================================

/**
 * GET /api/skills — 获取当前用户的 skills 列表
 * 需要 auth 中间件
 * query: ?status=published 筛选
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = await getAuthenticatedUserId(req)

  if (!userId) {
    res.status(401).json({ success: false, error: '需要登录后才能查看 skills' })
    return
  }

  let query = supabase.from('skills').select('*').eq('user_id', userId)

  // 可选状态筛选
  const status = req.query.status as string | undefined
  if (status) {
    query = query.eq('status', status)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) {
    console.error('[skills] list query failed:', error.message)
    res.status(500).json({ success: false, error: 'Failed to load skills' })
    return
  }

  res.json({ success: true, data: data ?? [] })
})

/**
 * GET /api/skills/discover — 发现公开的 skills（marketplace）
 * query: ?q=搜索词&sort=popular|recent
 * 注意：此路由必须在 /:id 之前注册
 */
router.get('/discover', async (req: Request, res: Response): Promise<void> => {
  const q = (req.query.q as string) || ''
  const sort = (req.query.sort as string) || 'recent'

  let query = supabase
    .from('skills')
    .select(`
      id, title, description, kind, protocol, status,
      invoke_count, created_at, user_id,
      profiles!inner(display_name, avatar_url, title)
    `)
    .in('status', ['published', 'verified'])

  // 搜索关键词
  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
  }

  // 排序
  if (sort === 'popular') {
    query = query.order('invoke_count', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query.limit(50)

  if (error) {
    console.error('[skills/discover] query failed:', error.message)
    res.status(500).json({ success: false, error: 'Failed to load discoverable skills' })
    return
  }

  const skills = (data ?? []).map((s: any) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    kind: s.kind,
    protocol: s.protocol,
    invokeCount: s.invoke_count,
    createdAt: (s.created_at as string)?.slice(0, 10),
    author: {
      userId: s.user_id,
      displayName: s.profiles?.display_name || '匿名用户',
      avatarUrl: s.profiles?.avatar_url,
      title: s.profiles?.title || '',
    },
  }))

  res.json({ success: true, data: skills })
})

/**
 * GET /api/skills/:id — 获取单个 skill 详情
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params

  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[skills/:id] query failed:', error.message)
    res.status(500).json({ success: false, error: 'Failed to load skill' })
    return
  }

  if (!data) {
    res.status(404).json({ success: false, error: 'Skill not found' })
    return
  }

  res.json({ success: true, data })
})

/**
 * POST /api/skills — 创建新 skill
 * body: { title, description, kind, protocol }
 * 自动生成 endpoint，status 默认 'draft'
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const userId = await getAuthenticatedUserId(req)

  if (!userId) {
    res.status(401).json({ success: false, error: '需要登录后才能创建 skill' })
    return
  }

  const { title, description, kind, protocol, evaluationId } = req.body as {
    title?: string
    description?: string
    kind?: string
    protocol?: any
    evaluationId?: string
  }

  if (!title || !description) {
    res.status(400).json({ success: false, error: 'title 和 description 是必须的' })
    return
  }

  // 校验 kind
  const validKinds = ['api', 'protocol', 'hybrid']
  const finalKind = validKinds.includes(kind || '') ? kind! : 'api'

  // 插入 skill 记录
  const { data, error } = await supabase
    .from('skills')
    .insert({
      user_id: userId,
      title,
      description,
      kind: finalKind,
      protocol: protocol ?? {},
      evaluation_id: evaluationId ?? null,
      status: 'draft',
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('[skills] create failed:', error?.message)
    res.status(500).json({ success: false, error: 'Failed to create skill' })
    return
  }

  // 自动生成 endpoint
  const endpoint = `/api/skills/${data.id}/invoke`
  const { error: updateError } = await supabase
    .from('skills')
    .update({ endpoint })
    .eq('id', data.id)

  if (updateError) {
    console.error('[skills] update endpoint failed:', updateError.message)
  }

  res.json({ success: true, data: { ...data, endpoint } })
})

/**
 * PATCH /api/skills/:id — 更新 skill
 * 可更新 title, description, protocol, status
 */
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = await getAuthenticatedUserId(req)

  if (!userId) {
    res.status(401).json({ success: false, error: '需要登录后才能更新 skill' })
    return
  }

  const { id } = req.params
  const { title, description, protocol, status } = req.body as {
    title?: string
    description?: string
    protocol?: any
    status?: string
  }

  // 校验 status
  if (status) {
    const validStatuses = ['draft', 'published', 'verified', 'revoked']
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, error: '无效的 status 值' })
      return
    }
  }

  // 构建更新对象（只包含提供的字段）
  const updates: Record<string, unknown> = {}
  if (title !== undefined) updates.title = title
  if (description !== undefined) updates.description = description
  if (protocol !== undefined) updates.protocol = protocol
  if (status !== undefined) updates.status = status

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ success: false, error: '没有需要更新的字段' })
    return
  }

  const { data, error } = await supabase
    .from('skills')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('[skills/:id] update failed:', error.message)
    res.status(500).json({ success: false, error: 'Failed to update skill' })
    return
  }

  if (!data) {
    res.status(404).json({ success: false, error: 'Skill not found or no permission' })
    return
  }

  res.json({ success: true, data })
})

/**
 * DELETE /api/skills/:id — 删除 skill
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = await getAuthenticatedUserId(req)

  if (!userId) {
    res.status(401).json({ success: false, error: '需要登录后才能删除 skill' })
    return
  }

  const { id } = req.params

  const { error } = await supabase
    .from('skills')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('[skills/:id] delete failed:', error.message)
    res.status(500).json({ success: false, error: 'Failed to delete skill' })
    return
  }

  res.json({ success: true, data: { id } })
})

// ============================================================
// Skill 核心功能路由
// ============================================================

/**
 * POST /api/skills/:id/publish — 发布 skill
 * 将 status 改为 'published'，返回公开 endpoint 和 MCP tool 定义
 */
router.post('/:id/publish', async (req: Request, res: Response): Promise<void> => {
  const userId = await getAuthenticatedUserId(req)

  if (!userId) {
    res.status(401).json({ success: false, error: '需要登录后才能发布 skill' })
    return
  }

  const { id } = req.params

  // 先查询 skill 确认归属
  const { data: existing, error: queryError } = await supabase
    .from('skills')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (queryError || !existing) {
    res.status(404).json({ success: false, error: 'Skill not found or no permission' })
    return
  }

  // 更新为 published
  const { data, error } = await supabase
    .from('skills')
    .update({ status: 'published' })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error || !data) {
    console.error('[skills/:id/publish] failed:', error?.message)
    res.status(500).json({ success: false, error: 'Failed to publish skill' })
    return
  }

  // 构建公开 endpoint 和 MCP tool 定义
  const publicEndpoint = data.endpoint || `/api/skills/${data.id}/invoke`
  const mcpTool = buildMcpToolDefinition(data)

  res.json({
    success: true,
    data: {
      ...data,
      publicEndpoint,
      mcpTool,
    },
    message: 'Skill 已发布，现在可以被企业 Agent 调用',
  })
})

/**
 * POST /api/skills/:id/invoke — 企业 Agent 调用 skill（核心功能）
 * 公开接口（企业 Agent 可调用），需要 API key 或 session
 * body: { input: any, callerLabel?: string, callerId?: string }
 */
router.post('/:id/invoke', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const { input, callerLabel, callerId } = req.body as {
    input?: any
    callerLabel?: string
    callerId?: string
  }

  if (input === undefined) {
    res.status(400).json({ success: false, error: 'input 是必须的' })
    return
  }

  // 查询 skill
  const { data: skill, error: skillError } = await supabase
    .from('skills')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (skillError || !skill) {
    res.status(404).json({ success: false, error: 'Skill not found' })
    return
  }

  // 只有已发布或已验证的 skill 才能被调用
  if (!['published', 'verified'].includes(skill.status)) {
    res.status(403).json({ success: false, error: '该 skill 尚未发布，无法被调用' })
    return
  }

  const startTime = Date.now()
  const label = callerLabel || 'enterprise-agent'

  // 执行 skill
  try {
    const { result, evaluation } = await invokeSkill(skill, input, supabase)
    const durationMs = Date.now() - startTime

    // 1. 记录调用日志到 skill_invocations
    const { error: logError } = await supabase.from('skill_invocations').insert({
      skill_id: id,
      caller_id: callerId ?? null,
      caller_label: label,
      input: input,
      output: result,
      duration_ms: durationMs,
      status: 'success',
    })

    if (logError) {
      console.error('[skills/:id/invoke] log failed:', logError.message)
    }

    // 2. 更新 skill 的调用次数和最后调用时间
    const { error: updateError } = await supabase
      .from('skills')
      .update({
        invoke_count: (skill.invoke_count ?? 0) + 1,
        last_invoked_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('[skills/:id/invoke] update invoke_count failed:', updateError.message)
    }

    res.json({
      success: true,
      data: {
        result,
        evaluation,
        durationMs,
      },
    })
  } catch (err) {
    const durationMs = Date.now() - startTime
    const errMsg = err instanceof Error ? err.message : 'Unknown error'

    // 记录失败的调用
    await supabase.from('skill_invocations').insert({
      skill_id: id,
      caller_id: callerId ?? null,
      caller_label: label,
      input: input,
      output: { error: errMsg },
      duration_ms: durationMs,
      status: 'failed',
    })

    console.error('[skills/:id/invoke] execution failed:', errMsg)
    res.status(500).json({ success: false, error: `Skill 执行失败: ${errMsg}` })
  }
})

/**
 * GET /api/skills/:id/invocations — 获取调用历史
 * 只有 skill owner 可查看
 */
router.get('/:id/invocations', async (req: Request, res: Response): Promise<void> => {
  const userId = await getAuthenticatedUserId(req)

  if (!userId) {
    res.status(401).json({ success: false, error: '需要登录后才能查看调用历史' })
    return
  }

  const { id } = req.params

  // 确认当前用户是 skill owner
  const { data: skill, error: skillError } = await supabase
    .from('skills')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle()

  if (skillError || !skill) {
    res.status(404).json({ success: false, error: 'Skill not found' })
    return
  }

  if (skill.user_id !== userId) {
    res.status(403).json({ success: false, error: '只有 skill 所有者可以查看调用历史' })
    return
  }

  const { data, error } = await supabase
    .from('skill_invocations')
    .select('*')
    .eq('skill_id', id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[skills/:id/invocations] query failed:', error.message)
    res.status(500).json({ success: false, error: 'Failed to load invocations' })
    return
  }

  res.json({ success: true, data: data ?? [] })
})

/**
 * POST /api/skills/from-trial/:evaluationId — 从试炼评估生成 skill
 * "入职携带体"：将一次试炼评估转化为可调用的 skill
 * 从 evaluation 中提取 portrait + report，自动生成 protocol
 */
router.post('/from-trial/:evaluationId', async (req: Request, res: Response): Promise<void> => {
  const userId = await getAuthenticatedUserId(req)

  if (!userId) {
    res.status(401).json({ success: false, error: '需要登录后才能从试炼生成 skill' })
    return
  }

  const { evaluationId } = req.params

  // 查询评估记录（含 portrait + report）
  const { data: evaluation, error: evalError } = await supabase
    .from('evaluations')
    .select('id, user_id, trial_id, portrait, cert_score, cert_level, report')
    .eq('id', evaluationId)
    .maybeSingle()

  if (evalError || !evaluation) {
    res.status(404).json({ success: false, error: '评估记录不存在' })
    return
  }

  // 确认是本人的评估
  if (evaluation.user_id !== userId) {
    res.status(403).json({ success: false, error: '只能从自己的评估生成 skill' })
    return
  }

  const portrait = evaluation.portrait || {}
  const report = evaluation.report || {}

  // 从评估中自动生成 protocol
  // 输入 schema：调用方传入任务描述
  // 输出 schema：返回能力画像 + 评估报告片段
  const protocol = {
    input_schema: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description: '需要验证的任务描述',
        },
        context: {
          type: 'string',
          description: '任务上下文/背景信息',
        },
      },
      required: ['task'],
    },
    output_schema: {
      type: 'object',
      properties: {
        applicable: { type: 'boolean', description: '该用户是否适合此任务' },
        confidence: { type: 'number', description: '置信度 0-100' },
        reasoning: { type: 'string', description: '判断依据' },
        relevantDimensions: {
          type: 'object',
          description: '相关能力维度分数',
        },
      },
    },
    evaluation_dimensions: Object.keys(portrait),
    source_portrait: portrait,
    source_cert_score: evaluation.cert_score,
    source_cert_level: evaluation.cert_level,
    source_report: report,
  }

  const title = `能力验证（认证 ${evaluation.cert_level || 'N/A'} · ${evaluation.cert_score || 0}分）`
  const description = `基于试炼评估自动生成。综合能力分数 ${evaluation.cert_score || 0}，等级 ${evaluation.cert_level || '未认证'}。企业 Agent 可调用此 skill 验证该用户是否具备相关能力。`

  // 创建 skill
  const { data: skill, error: skillError } = await supabase
    .from('skills')
    .insert({
      user_id: userId,
      title,
      description,
      kind: 'hybrid',
      protocol,
      evaluation_id: evaluationId,
      status: 'draft',
    })
    .select('*')
    .single()

  if (skillError || !skill) {
    console.error('[skills/from-trial] create failed:', skillError?.message)
    res.status(500).json({ success: false, error: 'Failed to create skill from trial' })
    return
  }

  // 自动生成 endpoint
  const endpoint = `/api/skills/${skill.id}/invoke`
  await supabase
    .from('skills')
    .update({ endpoint })
    .eq('id', skill.id)

  res.json({
    success: true,
    data: { ...skill, endpoint },
    message: '已从试炼评估生成 skill，发布后即可被企业 Agent 调用',
  })
})

/**
 * POST /api/skills/:id/promote-to-trial — 将 skill 发布为试炼协议
 * "题目即协议"：将 skill.protocol 转化为一个新的 trial
 */
router.post('/:id/promote-to-trial', async (req: Request, res: Response): Promise<void> => {
  const userId = await getAuthenticatedUserId(req)

  if (!userId) {
    res.status(401).json({ success: false, error: '需要登录后才能执行此操作' })
    return
  }

  const { id } = req.params

  // 查询 skill
  const { data: skill, error: skillError } = await supabase
    .from('skills')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (skillError || !skill) {
    res.status(404).json({ success: false, error: 'Skill not found' })
    return
  }

  // 从 skill.protocol 生成 trial 的 system_prompt
  const protocol = skill.protocol || {}
  const systemPrompt = `你是一个基于「${skill.title}」协议的试炼。

任务描述：${skill.description}

协议定义：
${JSON.stringify(protocol, null, 2)}

请根据以上协议，对参与者的能力进行严格评估。`

  // 生成唯一的 trial ID
  const trialId = `skill-${id.slice(0, 8)}`

  // 在 trials 表中插入新记录
  const { data: trial, error: trialError } = await supabase
    .from('trials')
    .insert({
      id: trialId,
      title: skill.title,
      description: skill.description,
      difficulty: 'intermediate',
      status: 'active',
      duration_hours: 48,
      tags: ['skill-protocol', skill.kind],
      participant_count: 0,
      system_prompt: systemPrompt,
    })
    .select('*')
    .single()

  if (trialError) {
    console.error('[skills/:id/promote-to-trial] insert trial failed:', trialError.message)
    res.status(500).json({ success: false, error: 'Failed to create trial from skill' })
    return
  }

  // 更新 skill 状态为已转化为试炼
  await supabase
    .from('skills')
    .update({ status: 'verified' })
    .eq('id', id)

  res.json({
    success: true,
    data: {
      trial,
      skillId: id,
      message: 'Skill 已成功转化为试炼协议',
    },
  })
})

// ============================================================
// Coding Events 路由（编码行为事件）
// 独立 router，在 app.ts 中挂载到 /api/coding-events
// ============================================================

export const codingEventsRouter = Router()

/**
 * POST /api/coding-events — 记录编码行为事件
 * body: { sessionId, events: [{ eventType, payload, charsAdded, charsDeleted }] }
 * 批量插入 coding_events 表
 */
codingEventsRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const userId = await getAuthenticatedUserId(req)

  if (!userId) {
    res.status(401).json({ success: false, error: '需要登录后才能记录编码事件' })
    return
  }

  const { sessionId, events } = req.body as {
    sessionId?: string
    events?: Array<{
      eventType: string
      payload?: any
      charsAdded?: number
      charsDeleted?: number
    }>
  }

  if (!sessionId) {
    res.status(400).json({ success: false, error: 'sessionId 是必须的' })
    return
  }

  if (!events || !Array.isArray(events) || events.length === 0) {
    res.status(400).json({ success: false, error: 'events 数组不能为空' })
    return
  }

  // 校验事件类型
  const validEventTypes = [
    'edit', 'search', 'paste', 'delete', 'refactor',
    'debug', 'test_run', 'git_commit', 'ai_assist', 'idle',
  ]

  const rows = events
    .filter((e) => validEventTypes.includes(e.eventType))
    .map((e) => ({
      session_id: sessionId,
      user_id: userId,
      event_type: e.eventType,
      payload: e.payload ?? {},
      chars_added: e.charsAdded ?? 0,
      chars_deleted: e.charsDeleted ?? 0,
    }))

  if (rows.length === 0) {
    res.status(400).json({ success: false, error: '没有有效的事件类型' })
    return
  }

  const { error } = await supabase.from('coding_events').insert(rows)

  if (error) {
    console.error('[coding-events] insert failed:', error.message)
    res.status(500).json({ success: false, error: 'Failed to record coding events' })
    return
  }

  res.json({
    success: true,
    data: { recorded: rows.length },
  })
})

/**
 * GET /api/coding-events/:sessionId — 获取会话编码行为统计
 * 返回按事件类型聚合的统计数据
 */
codingEventsRouter.get('/:sessionId', async (req: Request, res: Response): Promise<void> => {
  const userId = await getAuthenticatedUserId(req)

  if (!userId) {
    res.status(401).json({ success: false, error: '需要登录后才能查看编码事件' })
    return
  }

  const { sessionId } = req.params

  const { data, error } = await supabase
    .from('coding_events')
    .select('event_type, chars_added, chars_deleted, occurred_at')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .order('occurred_at', { ascending: true })

  if (error) {
    console.error('[coding-events/:sessionId] query failed:', error.message)
    res.status(500).json({ success: false, error: 'Failed to load coding events' })
    return
  }

  // 按事件类型聚合统计
  const statsByType: Record<string, { count: number; charsAdded: number; charsDeleted: number }> = {}
  let totalCharsAdded = 0
  let totalCharsDeleted = 0

  for (const event of data ?? []) {
    const type = event.event_type as string
    if (!statsByType[type]) {
      statsByType[type] = { count: 0, charsAdded: 0, charsDeleted: 0 }
    }
    statsByType[type].count++
    statsByType[type].charsAdded += event.chars_added ?? 0
    statsByType[type].charsDeleted += event.chars_deleted ?? 0
    totalCharsAdded += event.chars_added ?? 0
    totalCharsDeleted += event.chars_deleted ?? 0
  }

  res.json({
    success: true,
    data: {
      sessionId,
      totalEvents: data?.length ?? 0,
      totalCharsAdded,
      totalCharsDeleted,
      statsByType,
      timeline: data ?? [],
    },
  })
})

export default router
