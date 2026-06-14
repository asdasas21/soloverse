/**
 * 统一试炼行为评估管道
 * 工作区每次提交行为 → 后端 GLM 评估 → EMA 平滑 → 持久化
 * 替代前端客户端评分（可篡改）和 chat.ts 孤岛评估
 */
import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { getUserClient } from '../middleware/auth.js'
import { ok, err, notFound, unauthorized } from '../lib/response.js'
import { validateBody } from '../lib/validate.js'
import { logError } from '../lib/logger.js'
import { callGLM } from '../lib/glm.js'
import {
  rowToPortrait,
  portraitToRow,
  type Portrait,
} from '../lib/supabase.js'

const router = Router()

const EMA_ALPHA = 0.35

// Zod schema for action submission
const actionSchema = z.object({
  sessionId: z.string().uuid(),
  trialId: z.string(),
  scenarioId: z.string(),
  workspaceType: z.enum(['decision', 'code-review', 'design', 'code-edit', 'pitch']),
  focusDimensions: z.array(z.string()),
  actionData: z.record(z.string(), z.unknown()),
})

const EVAL_SYSTEM_PROMPT = `你是一位严格的技术能力评估专家。你正在观察一个工程师在真实工作区中的操作行为，需要评估其六维能力。

评估维度（0-100分）：
- curiosity（好奇心）：是否主动探索更多方案、提出有深度的问题
- reliability（靠谱）：操作是否准确、逻辑清晰、有条理
- factChecking（事实洁癖）：是否验证假设、是否注意边界条件
- diverseThinking（多元化思维）：是否考虑多种方案、是否权衡利弊
- uncertaintyTolerance（忍受不确定性）：面对模糊问题是否从容
- lowEgoHighDrive（低ego高自驱）：是否展现出学习和改进的动力

评分标准：
- 90-100：卓越，远超预期
- 75-89：优秀，高级工程师水平
- 60-74：合格，达到基础要求
- 40-59：不足，需要改进
- 0-39：很差，或无法体现

你必须返回 JSON：{"curiosity": 数字, "reliability": 数字, "factChecking": 数字, "diverseThinking": 数字, "uncertaintyTolerance": 数字, "lowEgoHighDrive": 数字, "reasoning": "简短说明"}

只返回 JSON，不要其他内容。`

/**
 * 将工作区行为数据格式化为 AI 可读的评估文本
 */
function formatActionForEval(
  workspaceType: string,
  actionData: Record<string, unknown>,
  focusDimensions: string[]
): string {
  const parts: string[] = []

  parts.push(`工作区类型：${workspaceType}`)
  parts.push(`重点评估维度：${focusDimensions.join(', ')}`)

  switch (workspaceType) {
    case 'decision': {
      const label = String(actionData.label ?? '')
      const weight = Number(actionData.weight ?? 0)
      parts.push(`决策选择："${label}"`)
      parts.push(`（系统记录的决策权重：${weight}/5，仅供参考，你需要独立判断这个决策的质量）`)
      break
    }
    case 'code-review': {
      const findings = actionData.findings as Array<Record<string, unknown>> ?? []
      parts.push(`发现的问题数量：${findings.length}`)
      for (const f of findings.slice(0, 10)) {
        parts.push(`- [${f.severity ?? 'unknown'}] 行 ${f.line ?? '?'}: ${f.note ?? f.description ?? ''}`)
      }
      break
    }
    case 'design': {
      const components = actionData.placedComponents as unknown[] ?? []
      const connections = actionData.connections as unknown[] ?? []
      parts.push(`放置的架构组件：${components.length} 个`)
      parts.push(`组件间连接：${connections.length} 个`)
      break
    }
    case 'code-edit': {
      const code = String(actionData.code ?? '')
      parts.push(`提交的代码（${code.length} 字符）：`)
      parts.push(code.slice(0, 2000))
      break
    }
    case 'pitch': {
      const sections = actionData.sections as Record<string, string> ?? {}
      const entries = Object.entries(sections)
      parts.push(`路演内容（${entries.length} 个部分）：`)
      for (const [key, value] of entries) {
        parts.push(`【${key}】${String(value).slice(0, 500)}`)
      }
      break
    }
  }

  return parts.join('\n')
}

/**
 * Fallback evaluation when GLM is unavailable.
 * Uses conservative heuristics based on action data.
 */
function fallbackEvaluation(
  currentScores: Portrait,
  workspaceType: string,
  actionData: Record<string, unknown>,
  focusDimensions: string[]
): Portrait {
  let qualityScore = 60

  if (actionData.weight !== undefined) {
    qualityScore = 40 + (Number(actionData.weight) / 5) * 50
  } else if (Array.isArray(actionData.findings)) {
    qualityScore = Math.min(85, 40 + actionData.findings.length * 10)
  } else if (typeof actionData.code === 'string') {
    qualityScore = Math.min(80, 50 + Math.min(30, actionData.code.length / 80))
  } else if (Array.isArray(actionData.placedComponents)) {
    qualityScore = Math.min(85, 45 + actionData.placedComponents.length * 5 + (Array.isArray(actionData.connections) ? actionData.connections.length * 3 : 0))
  } else if (actionData.sections && typeof actionData.sections === 'object') {
    const totalLen = Object.values(actionData.sections).reduce((s, v) => s + String(v).length, 0)
    qualityScore = Math.min(82, 45 + totalLen / 20)
  }

  qualityScore = Math.max(30, Math.min(90, Math.round(qualityScore)))

  const result: Portrait = { ...currentScores }
  for (const dim of focusDimensions) {
    if (dim in result) {
      result[dim as keyof Portrait] = Math.round(EMA_ALPHA * qualityScore + (1 - EMA_ALPHA) * result[dim as keyof Portrait])
    }
  }
  return result
}

/**
 * POST /api/trial-actions
 * 接收工作区行为，GLM 评估，EMA 平滑，持久化到 trial_sessions
 */
router.post('/', validateBody(actionSchema), async (req: Request, res: Response): Promise<void> => {
  const authResult = await getUserClient(req)
  if (!authResult) {
    unauthorized(res, '需要登录后才能提交行为')
    return
  }
  const { client: supabase, userId } = authResult

  const { sessionId, scenarioId, workspaceType, focusDimensions, actionData } = req.body

  // Load session
  const { data: session, error: sessionError } = await supabase
    .from('trial_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionError || !session) {
    notFound(res, '试炼会话不存在')
    return
  }

  // Ownership check
  if (session.user_id !== userId) {
    err(res, '无权操作他人的试炼会话', 403)
    return
  }

  const currentScores = rowToPortrait(session)
  let newScores: Portrait

  // Build action record for messages array (so evaluate.ts and anticheat.ts can use it)
  const actionRecord = {
    role: 'user',
    content: `[${workspaceType}] ${formatActionForEval(workspaceType, actionData, focusDimensions)}`,
    scenarioId,
    workspaceType,
    timestamp: new Date().toISOString(),
  }

  // Try GLM evaluation
  try {
    const evalText = formatActionForEval(workspaceType, actionData, focusDimensions)
    const evalPrompt = `以下是工程师在工作区中的操作行为：

${evalText}

当前累计六维分数：${JSON.stringify(currentScores)}
请根据此操作行为评估六维能力。评分应在此操作的基础上调整（上下浮动不超过15分）。`

    const raw = await callGLM(
      [
        { role: 'system', content: EVAL_SYSTEM_PROMPT },
        { role: 'user', content: evalPrompt },
      ],
      { temperature: 0.3, responseFormat: 'json' }
    )

    const parsed = JSON.parse(raw) as Portrait & { reasoning?: string }
    const dimensions: Array<keyof Portrait> = [
      'curiosity', 'reliability', 'factChecking', 'diverseThinking', 'uncertaintyTolerance', 'lowEgoHighDrive'
    ]

    newScores = { ...currentScores }
    for (const dim of dimensions) {
      const val = Number(parsed[dim])
      if (!isNaN(val)) {
        const clamped = Math.max(0, Math.min(100, Math.round(val)))
        newScores[dim] = Math.round(EMA_ALPHA * clamped + (1 - EMA_ALPHA) * currentScores[dim])
      }
    }
  } catch (evalErr) {
    logError('trial-actions', 'GLM evaluation failed, using fallback', { error: String(evalErr) })
    newScores = fallbackEvaluation(currentScores, workspaceType, actionData, focusDimensions)
  }

  // Update session: increment turn count, append action to messages, update scores
  const messages = Array.isArray(session.messages) ? session.messages : []
  messages.push(actionRecord)

  const { error: updateError } = await supabase
    .from('trial_sessions')
    .update({
      messages,
      turn_count: (session.turn_count ?? 0) + 1,
      ...portraitToRow(newScores),
    })
    .eq('id', sessionId)

  if (updateError) {
    logError('trial-actions', 'session update failed', { error: updateError.message })
    err(res, '行为数据保存失败', 500)
    return
  }

  ok(res, {
    scores: newScores,
    turnCount: (session.turn_count ?? 0) + 1,
  })
})

export default router
