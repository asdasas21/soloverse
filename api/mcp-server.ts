/**
 * TalentX MCP Server — 轻量级 MCP-over-HTTP 协议处理器
 *
 * 让外部 AI 工具（Claude、Cursor）可以通过 MCP 协议（JSON-RPC 2.0）
 * 查询 TalentX 用户能力画像、验证证书、搜索人才、调用 skills 等。
 *
 * 不依赖 @modelcontextprotocol/sdk，直接实现 JSON-RPC 2.0 规范。
 */

import { Router, type Request, type Response } from 'express'
import {
  supabase,
  computeCertScore,
  getCertLevel,
  type Portrait,
} from './lib/supabase.js'

const router = Router()

// ============================================================
// MCP Tools 定义
// ============================================================

const TOOLS = [
  {
    name: 'get_user_profile',
    description: '获取 TalentX 用户的能力画像，包括六维分数、认证等级、综合分',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'TalentX 用户 ID' },
      },
      required: ['userId'],
    },
  },
  {
    name: 'verify_certificate',
    description: '验证 TalentX 能力认证证书的真伪，返回证书详情',
    inputSchema: {
      type: 'object',
      properties: {
        certId: {
          type: 'string',
          description: '证书编号，格式 TX-YYYY-LX-XXXXX',
        },
      },
      required: ['certId'],
    },
  },
  {
    name: 'get_user_skills',
    description: '获取用户已发布的能力验证 Skills 列表，可用于直接调用验证',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'TalentX 用户 ID' },
      },
      required: ['userId'],
    },
  },
  {
    name: 'invoke_skill',
    description: '调用用户的 TalentX 能力验证 Skill，直接用实际任务验证能力',
    inputSchema: {
      type: 'object',
      properties: {
        skillId: { type: 'string', description: 'Skill ID' },
        input: { type: 'object', description: '输入参数' },
        callerLabel: { type: 'string', description: '调用者标识' },
      },
      required: ['skillId', 'input'],
    },
  },
  {
    name: 'search_talent',
    description: '按能力维度和认证等级搜索 TalentX 人才库',
    inputSchema: {
      type: 'object',
      properties: {
        minScore: { type: 'number', description: '最低综合分' },
        certLevel: { type: 'string', description: '认证等级 C1/C2/C3' },
        dimension: {
          type: 'string',
          enum: [
            'curiosity',
            'reliability',
            'factChecking',
            'diverseThinking',
            'uncertaintyTolerance',
            'lowEgoHighDrive',
          ],
          description: '特定能力维度（六维之一）',
        },
        minDimensionScore: {
          type: 'number',
          description: '指定维度的最低分数（需配合 dimension 使用）',
        },
        limit: {
          type: 'number',
          description: '返回数量上限',
          default: 10,
        },
      },
    },
  },
  {
    name: 'get_coding_behavior',
    description: '获取用户在 TalentX 试炼中的编码行为统计（搜索频率、重构习惯等）',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
      },
      required: ['userId'],
    },
  },
  {
    name: 'get_leaderboard',
    description: '获取 TalentX 能力排行榜，按综合分降序返回排名',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: '返回数量上限（默认 20，最大 100）',
          default: 20,
        },
      },
    },
  },
]

// ============================================================
// Tool 调用处理
// ============================================================

/**
 * 获取用户能力画像
 * 查询 profiles + evaluations，返回六维分数、认证等级、综合分
 */
async function getUserProfile(userId: string) {
  // 查询用户基本信息
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, title')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) {
    throw new Error(`查询用户信息失败: ${profileError.message}`)
  }

  if (!profile) {
    return { found: false, message: '用户不存在' }
  }

  // 查询最新评估记录（画像）
  const { data: evaluation, error: evalError } = await supabase
    .from('evaluations')
    .select('portrait, cert_score, cert_level, trial_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (evalError) {
    throw new Error(`查询评估记录失败: ${evalError.message}`)
  }

  let portrait: Portrait | null = null
  let certScore: number | null = null
  let certLevel: ReturnType<typeof getCertLevel> = null

  if (evaluation && evaluation.portrait) {
    portrait = evaluation.portrait as Portrait
    certScore = evaluation.cert_score ?? computeCertScore(portrait)
    certLevel = evaluation.cert_level ?? getCertLevel(certScore)
  }

  // 查询试炼次数
  const { count: trialCount, error: countError } = await supabase
    .from('trial_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (countError) {
    console.error('[mcp] 统计试炼次数失败:', countError.message)
  }

  return {
    found: true,
    name: profile.display_name || profile.username,
    title: profile.title,
    bio: profile.bio,
    avatar: profile.avatar_url,
    portrait,
    certScore,
    certLevel,
    trialCount: trialCount ?? 0,
    lastEvaluatedAt: evaluation
      ? (evaluation.created_at as string).slice(0, 10)
      : null,
  }
}

/**
 * 验证证书真伪
 * 查询 certificates 表，返回证书详情
 */
async function verifyCertificate(certId: string) {
  const { data: cert, error } = await supabase
    .from('certificates')
    .select(
      `
      cert_number,
      user_id,
      level,
      cert_score,
      portrait,
      issued_at,
      is_revoked,
      profiles!inner(display_name, username)
    `
    )
    .eq('cert_number', certId)
    .maybeSingle()

  if (error) {
    throw new Error(`查询证书失败: ${error.message}`)
  }

  if (!cert) {
    return { valid: false, message: '证书不存在' }
  }

  if (cert.is_revoked) {
    return {
      valid: false,
      revoked: true,
      certNumber: cert.cert_number,
      message: '该证书已被撤销',
    }
  }

  // 计算有效期（1 年）
  const issuedAt = new Date(cert.issued_at as string)
  const validUntil = new Date(issuedAt)
  validUntil.setFullYear(validUntil.getFullYear() + 1)

  const levelNameMap: Record<string, string> = {
    C1: '基础级',
    C2: '专业级',
    C3: '专家级',
  }

  const profileRows = cert.profiles as Array<{
    display_name: string
    username: string
  }>
  const profileData =
    profileRows && profileRows.length > 0 ? profileRows[0] : null

  return {
    valid: true,
    revoked: false,
    certNumber: cert.cert_number,
    userId: cert.user_id,
    userName: profileData?.display_name || profileData?.username || 'TalentX 用户',
    level: cert.level,
    levelName: levelNameMap[cert.level] ?? cert.level,
    certScore: Number(cert.cert_score),
    dimensions: cert.portrait,
    issuedAt: issuedAt.toISOString().slice(0, 10),
    validUntil: validUntil.toISOString().slice(0, 10),
  }
}

/**
 * 获取用户已发布的 skills 列表
 */
async function getUserSkills(userId: string) {
  const { data: skills, error } = await supabase
    .from('skills')
    .select(
      'id, title, description, kind, protocol, endpoint, status, invoke_count, last_invoked_at, created_at'
    )
    .eq('user_id', userId)
    .in('status', ['published', 'verified'])
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`查询 skills 失败: ${error.message}`)
  }

  return {
    userId,
    count: skills?.length ?? 0,
    skills: (skills ?? []).map((s: any) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      kind: s.kind,
      endpoint: s.endpoint,
      status: s.status,
      invokeCount: s.invoke_count,
      inputSchema: s.protocol?.input_schema ?? null,
      outputSchema: s.protocol?.output_schema ?? null,
      evaluationDimensions: s.protocol?.evaluation_dimensions ?? null,
    })),
  }
}

/**
 * 调用用户的 skill
 * 记录调用日志，返回执行结果
 */
async function invokeSkill(
  skillId: string,
  input: Record<string, unknown>,
  callerLabel?: string
) {
  // 查询 skill 详情
  const { data: skill, error: skillError } = await supabase
    .from('skills')
    .select('id, user_id, title, kind, protocol, endpoint, status')
    .eq('id', skillId)
    .maybeSingle()

  if (skillError) {
    throw new Error(`查询 skill 失败: ${skillError.message}`)
  }

  if (!skill) {
    return { success: false, error: 'Skill 不存在' }
  }

  if (!['published', 'verified'].includes(skill.status)) {
    return { success: false, error: `Skill 当前状态为 ${skill.status}，不可调用` }
  }

  const startTime = Date.now()

  // 执行 skill —— 根据类型处理
  // 对于 'api' / 'hybrid' 类型，如果配置了 endpoint，转发到对应 HTTP 接口
  // 对于 'protocol' 类型，将输入参数封装为评估任务
  let output: Record<string, unknown> = {}
  let status: 'success' | 'failed' = 'success'

  try {
    if (skill.endpoint) {
      // 调用 skill 的 HTTP 端点
      const response = await fetch(
        `${process.env.API_BASE_URL || 'http://localhost:3001'}${skill.endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': skill.user_id,
          },
          body: JSON.stringify(input),
        }
      )

      if (response.ok) {
        output = (await response.json()) as Record<string, unknown>
      } else {
        status = 'failed'
        output = { error: `HTTP ${response.status}`, body: await response.text() }
      }
    } else {
      // 无 endpoint 的 skill：返回协议定义，提示调用方按协议执行
      output = {
        message: '该 skill 为协议类型，需按 protocol 定义执行',
        protocol: skill.protocol,
        input,
      }
    }
  } catch (err) {
    status = 'failed'
    output = {
      error: err instanceof Error ? err.message : '执行失败',
    }
  }

  const durationMs = Date.now() - startTime

  // 记录调用日志
  await supabase.from('skill_invocations').insert({
    skill_id: skillId,
    caller_label: callerLabel || 'mcp-anonymous',
    input,
    output,
    duration_ms: durationMs,
    status,
  })

  // 更新 skill 的调用次数和最后调用时间
  const { data: curSkill } = await supabase
    .from('skills')
    .select('invoke_count')
    .eq('id', skillId)
    .maybeSingle()

  await supabase
    .from('skills')
    .update({
      invoke_count: (curSkill?.invoke_count || 0) + 1,
      last_invoked_at: new Date().toISOString(),
    })
    .eq('id', skillId)

  return {
    success: status === 'success',
    skillTitle: skill.title,
    skillKind: skill.kind,
    durationMs,
    output,
  }
}

/**
 * 搜索人才
 * 按综合分和认证等级筛选
 */
async function searchTalent(params: {
  minScore?: number
  certLevel?: string
  dimension?: string
  minDimensionScore?: number
  limit?: number
}) {
  const { minScore, certLevel, dimension, minDimensionScore, limit = 10 } = params

  let query = supabase
    .from('evaluations')
    .select(
      `
      user_id,
      cert_score,
      cert_level,
      portrait,
      created_at,
      profiles!inner(display_name, avatar_url, title)
    `
    )
    .order('cert_score', { ascending: false })
    .limit(Math.min(limit * 3, 100))

  if (typeof minScore === 'number') {
    query = query.gte('cert_score', minScore)
  }

  if (certLevel) {
    query = query.eq('cert_level', certLevel)
  }

  const { data: evals, error } = await query

  if (error) {
    throw new Error(`搜索人才失败: ${error.message}`)
  }

  // 每个用户只取最高分的一条
  const seen = new Set<string>()
  let results = (evals ?? []).filter((e: any) => {
    if (seen.has(e.user_id)) return false
    seen.add(e.user_id)
    return true
  })

  // 维度筛选：从 portrait 中读取指定维度分数
  const VALID_DIMENSIONS = [
    'curiosity',
    'reliability',
    'factChecking',
    'diverseThinking',
    'uncertaintyTolerance',
    'lowEgoHighDrive',
  ]
  if (
    dimension &&
    VALID_DIMENSIONS.includes(dimension) &&
    typeof minDimensionScore === 'number'
  ) {
    results = results.filter((e: any) => {
      const score = e.portrait?.[dimension]
      return typeof score === 'number' && score >= minDimensionScore
    })
  }

  const talents = results
    .slice(0, limit)
    .map((e: any) => ({
      userId: e.user_id,
      displayName: e.profiles?.display_name || '匿名用户',
      avatarUrl: e.profiles?.avatar_url,
      title: e.profiles?.title || '',
      certScore: Number(e.cert_score),
      certLevel: e.cert_level,
      portrait: e.portrait,
      evaluatedAt: (e.created_at as string)?.slice(0, 10),
    }))

  return {
    count: talents.length,
    filters: { minScore, certLevel, dimension, minDimensionScore, limit },
    talents,
  }
}

/**
 * 获取用户编码行为统计
 * 聚合 coding_events 表
 */
async function getCodingBehavior(userId: string) {
  const { data: events, error } = await supabase
    .from('coding_events')
    .select('event_type, chars_added, chars_deleted, occurred_at')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })

  if (error) {
    throw new Error(`查询编码行为失败: ${error.message}`)
  }

  if (!events || events.length === 0) {
    return {
      userId,
      totalEvents: 0,
      message: '暂无编码行为数据',
    }
  }

  // 按事件类型聚合统计
  const eventTypeCount: Record<string, number> = {}
  let totalCharsAdded = 0
  let totalCharsDeleted = 0

  for (const e of events as Array<any>) {
    eventTypeCount[e.event_type] = (eventTypeCount[e.event_type] || 0) + 1
    totalCharsAdded += e.chars_added || 0
    totalCharsDeleted += e.chars_deleted || 0
  }

  // 计算行为特征
  const searchCount = eventTypeCount['search'] || 0
  const refactorCount = eventTypeCount['refactor'] || 0
  const pasteCount = eventTypeCount['paste'] || 0
  const aiAssistCount = eventTypeCount['ai_assist'] || 0
  const testRunCount = eventTypeCount['test_run'] || 0
  const idleCount = eventTypeCount['idle'] || 0

  return {
    userId,
    totalEvents: events.length,
    eventTypeDistribution: eventTypeCount,
    totalCharsAdded,
    totalCharsDeleted,
    // 行为特征指标
    behaviorMetrics: {
      searchFrequency: searchCount,
      refactorHabits: refactorCount,
      pasteRatio: events.length > 0 ? Math.round((pasteCount / events.length) * 100) / 100 : 0,
      aiAssistUsage: aiAssistCount,
      testRunCount,
      idleRatio: events.length > 0 ? Math.round((idleCount / events.length) * 100) / 100 : 0,
    },
    lastActivityAt:
      events.length > 0
        ? (events[0].occurred_at as string).slice(0, 10)
        : null,
  }
}

/**
 * 获取能力排行榜
 * 按综合分降序返回，每个用户只取最高分
 */
async function getLeaderboard(limit: number = 20) {
  const safeLimit = Math.min(Math.max(limit || 20, 1), 100)

  const { data: evals, error } = await supabase
    .from('evaluations')
    .select(
      `
      user_id,
      cert_score,
      cert_level,
      portrait,
      created_at,
      profiles!inner(display_name, avatar_url, title)
    `
    )
    .order('cert_score', { ascending: false })
    .limit(safeLimit * 2) // 取多一些以便去重后仍够数

  if (error) {
    throw new Error(`查询排行榜失败: ${error.message}`)
  }

  // 每个用户只取最高分的一条
  const seen = new Set<string>()
  const rankings = (evals ?? [])
    .filter((e: any) => {
      if (seen.has(e.user_id)) return false
      seen.add(e.user_id)
      return true
    })
    .slice(0, safeLimit)
    .map((e: any, i: number) => ({
      rank: i + 1,
      userId: e.user_id,
      displayName: e.profiles?.display_name || '匿名用户',
      avatarUrl: e.profiles?.avatar_url,
      title: e.profiles?.title || '',
      certScore: Number(e.cert_score),
      certLevel: e.cert_level,
      evaluatedAt: (e.created_at as string)?.slice(0, 10),
    }))

  return {
    total: rankings.length,
    rankings,
  }
}

/**
 * Tool 调用分发器
 */
async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case 'get_user_profile':
      return getUserProfile(args.userId as string)

    case 'verify_certificate':
      return verifyCertificate(args.certId as string)

    case 'get_user_skills':
      return getUserSkills(args.userId as string)

    case 'invoke_skill':
      return invokeSkill(
        args.skillId as string,
        (args.input as Record<string, unknown>) ?? {},
        args.callerLabel as string | undefined
      )

    case 'search_talent':
      return searchTalent({
        minScore: args.minScore as number | undefined,
        certLevel: args.certLevel as string | undefined,
        dimension: args.dimension as string | undefined,
        minDimensionScore: args.minDimensionScore as number | undefined,
        limit: args.limit as number | undefined,
      })

    case 'get_coding_behavior':
      return getCodingBehavior(args.userId as string)

    case 'get_leaderboard':
      return getLeaderboard(
        typeof args.limit === 'number' ? args.limit : 20
      )

    default:
      throw new Error(`未知的 tool: ${toolName}`)
  }
}

// ============================================================
// MCP 协议入口 — POST /api/mcp
// ============================================================

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { method, params, id } = req.body ?? {}

  // JSON-RPC 2.0 协议处理
  switch (method) {
    case 'initialize':
      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'talentx-mcp', version: '1.0.0' },
          capabilities: { tools: {} },
        },
      })
      return

    case 'tools/list':
      res.json({ jsonrpc: '2.0', id, result: { tools: TOOLS } })
      return

    case 'tools/call': {
      const { name, arguments: args } = params ?? {}
      try {
        const result = await handleToolCall(name, args ?? {})
        res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          },
        })
      } catch (err) {
        res.json({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32000,
            message: err instanceof Error ? err.message : 'Tool 执行失败',
          },
        })
      }
      return
    }

    case 'ping':
      res.json({ jsonrpc: '2.0', id, result: {} })
      return

    default:
      res.json({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: 'Method not found' },
      })
      return
  }
})

// ============================================================
// SSE 流式端点 — GET /api/mcp/sse
// 用于 streamable HTTP transport，保持长连接
// ============================================================

router.get('/sse', (req: Request, res: Response): void => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  // 发送就绪消息
  res.write(
    `data: ${JSON.stringify({ type: 'ready', server: 'talentx-mcp' })}\n\n`
  )

  // 定时发送心跳，保持连接
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`)
  }, 30000)

  // 连接关闭时清理
  req.on('close', () => clearInterval(interval))
})

// ============================================================
// 服务发现端点 — GET /api/mcp
// 返回 MCP 服务元信息，便于外部 AI 工具自动发现
// ============================================================

router.get('/', (_req: Request, res: Response): void => {
  res.json({
    server: 'talentx-mcp',
    version: '1.0.0',
    protocolVersion: '2024-11-05',
    transport: 'http',
    endpoint: '/api/mcp',
    sseEndpoint: '/api/mcp/sse',
    tools: TOOLS.map((t) => t.name),
    description: 'TalentX MCP Server — 通过 MCP 协议查询人才能力画像、验证证书、搜索人才',
  })
})

export default router
