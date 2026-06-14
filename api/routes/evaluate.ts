import { Router, type Request, type Response } from 'express'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  rowToPortrait,
  computeCertScore,
  getCertLevel,
  generateCertNumber,
  generateVerificationCode,
  type Portrait,
} from '../lib/supabase.js'
import { getUserClient } from '../middleware/auth.js'
import { callGLM } from '../lib/glm.js'
import { ok, err, notFound, unauthorized } from '../lib/response.js'
import { logError } from '../lib/logger.js'
import { runCheatDetection } from '../lib/anticheat.js'

const router = Router()

// 维度 key 到中文标签的映射（用于报告生成）
const DIM_LABELS: Record<string, string> = {
  curiosity: '好奇心',
  reliability: '靠谱',
  factChecking: '事实洁癖',
  diverseThinking: '多元化思维',
  uncertaintyTolerance: '忍受不确定性',
  lowEgoHighDrive: '低ego高自驱',
}

// AI 定性评审报告结构
interface AIReport {
  summary: string // 一句话总结
  strengths: string[] // 2-3 个亮点
  improvements: string[] // 1-2 个改进建议
  evidence: Array<{ // 证据引用
    dimension: string // 维度 key (curiosity, reliability, etc.)
    quote: string // 用户对话中的原话
    comment: string // AI 点评
  }>
}

// --- 基于 portrait 分数的 fallback 报告（GLM 不可用时使用） ---

function generateFallbackReport(portrait: Portrait): AIReport {
  const entries = Object.entries(portrait) as Array<[keyof Portrait, number]>
  // 按分数降序排列
  const sorted = [...entries].sort((a, b) => b[1] - a[1])
  const top = sorted[0]
  const bottom = sorted[sorted.length - 1]

  return {
    summary: '基于对话表现的综合能力评估已完成，整体表现处于中等水平，仍有提升空间。',
    strengths: [
      `${DIM_LABELS[top[0]]}维度表现突出（${top[1]}分），展现了良好的相关能力。`,
    ],
    improvements: [
      `${DIM_LABELS[bottom[0]]}维度相对薄弱（${bottom[1]}分），建议针对性加强。`,
    ],
    evidence: [],
  }
}

// --- 调用 GLM 生成定性评审报告 ---

const REPORT_SYSTEM_PROMPT = `你是一位严谨的技术能力评估专家。请根据用户在技术试炼中的对话记录和六维能力分数，生成一份定性分析报告。

要求：
1. summary：用一句话概括用户的整体表现（中文，不超过50字）
2. strengths：列出 2-3 个突出亮点，结合具体能力维度
3. improvements：列出 1-2 个改进建议，具体可执行
4. evidence：从用户对话中引用原话作为证据，每条包含 dimension（维度 key：curiosity/reliability/factChecking/diverseThinking/uncertaintyTolerance/lowEgoHighDrive）、quote（用户原话，不超过80字）、comment（你的点评，中文）

必须返回 JSON 对象，格式：
{"summary": "string", "strengths": ["string"], "improvements": ["string"], "evidence": [{"dimension": "string", "quote": "string", "comment": "string"}]}

只返回 JSON，不要返回其他内容。所有文字必须使用中文。`

async function generateAIReport(
  sessionId: string,
  portrait: Portrait,
  supabaseClient: SupabaseClient
): Promise<AIReport> {
  // 从 Supabase 加载 session 的 messages（对话历史）
  const { data: sessionRow, error } = await supabaseClient
    .from('trial_sessions')
    .select('messages')
    .eq('id', sessionId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load session messages: ${error.message}`)
  }

  const messages: Array<{ role: string; content: string }> =
    Array.isArray(sessionRow?.messages) ? sessionRow.messages : []

  // 提取用户发言作为对话文本
  const userTurns = messages.filter((m) => m.role === 'user')
  const conversationText =
    userTurns.length > 0
      ? userTurns
          .map((m, i) => `【用户发言${i + 1}】${m.content}`)
          .join('\n\n')
      : '（无对话记录）'

  const glmMessages = [
    { role: 'system', content: REPORT_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `以下是用户在技术试炼中的对话记录：

${conversationText}

用户当前的六维能力分数：
${JSON.stringify(portrait, null, 2)}

维度含义：
- curiosity（好奇心）
- reliability（靠谱）
- factChecking（事实洁癖）
- diverseThinking（多元化思维）
- uncertaintyTolerance（忍受不确定性）
- lowEgoHighDrive（低ego高自驱）

请基于以上信息生成定性分析报告。`,
    },
  ]

  const result = await callGLM(glmMessages, {
    temperature: 0.4,
    responseFormat: 'json',
  })

  const parsed = JSON.parse(result) as AIReport

  // 字段补全，保证结构稳定
  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
    evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
  }
}

/** POST /api/evaluate */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { trialId, sessionId } = req.body as {
    trialId?: string; sessionId?: string
  }

  if (!trialId || !sessionId) {
    err(res, 'trialId and sessionId are required', 400)
    return
  }

  // 鉴权：必须登录 + 创建 per-request client（RLS 生效）
  const authResult = await getUserClient(req)
  if (!authResult) {
    unauthorized(res, '需要登录后才能提交评估')
    return
  }
  const { client: supabase, userId: authenticatedUserId } = authResult

  // Load session from Supabase
  const { data: session, error: sessionError } = await supabase
    .from('trial_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionError) {
    logError('evaluate', 'session query failed', { error: sessionError.message })
    err(res, 'Failed to load session', 500)
    return
  }

  let portrait: Portrait
  let userId: string

  if (session) {
    userId = session.user_id
    // 所有权校验：只有 session 的所有者才能提交评估
    if (userId !== authenticatedUserId) {
      err(res, '无权评估他人的试炼 session', 403)
      return
    }
    // Use accumulated EMA-smoothed scores directly (no turn bonus hack)
    portrait = rowToPortrait(session)
  } else {
    // session 不存在时返回 404，不再使用硬编码 fallback
    notFound(res, 'Session not found')
    return
  }

  // Compute D1-D5 dimension scores from portrait (for display)
  const dimensionScores: Record<string, number> = {
    D1_codeQuality: Math.round(Math.min(100, (portrait.reliability + portrait.factChecking) / 2)),
    D2_problemSolving: Math.round(Math.min(100, (portrait.diverseThinking + portrait.uncertaintyTolerance) / 2)),
    D3_innovation: Math.round(Math.min(100, (portrait.diverseThinking + portrait.curiosity) / 2)),
    D4_communication: Math.round(Math.min(100, (portrait.lowEgoHighDrive + portrait.reliability) / 2)),
    D5_execution: Math.round(Math.min(100, (portrait.reliability + portrait.lowEgoHighDrive) / 2)),
  }

  let certScore = computeCertScore(portrait)
  let certLevel = getCertLevel(certScore)

  // 防作弊检测：行为一致性 + 时间异常 + 内容异常
  const messages = Array.isArray(session.messages) ? session.messages : []
  const cheatResult = await runCheatDetection(
    supabase,
    userId,
    sessionId,
    messages,
    session.turn_count ?? 0,
    session.started_at ?? null
  )

  // 高风险：拒绝颁发证书，分数打折
  if (cheatResult.suspicious) {
    logError('evaluate', 'cheat detected', {
      userId,
      sessionId,
      riskScore: cheatResult.riskScore,
      flags: cheatResult.flags,
    })
    // 可疑行为：分数降低 30%，不颁发证书
    certScore = Math.round(certScore * 0.7)
    certLevel = null
  }

  // 生成 AI 定性评审报告（失败时使用 fallback，不阻断评估流程）
  let aiReport: AIReport
  try {
    aiReport = await generateAIReport(sessionId, portrait, supabase)
  } catch (reportErr) {
    logError('evaluate', 'AI report generation failed, using fallback', { error: String(reportErr) })
    aiReport = generateFallbackReport(portrait)
  }

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
        report: aiReport,
      })
      .select('id')
      .single()

    if (evalError) {
      logError('evaluate', 'insert evaluation failed', { error: evalError.message })
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
        logError('evaluate', 'insert certificate failed', { error: certError.message })
      }
    }

    // Mark session as evaluated
    const { error: updateError } = await supabase
      .from('trial_sessions')
      .update({ status: 'evaluated', submitted_at: new Date().toISOString() })
      .eq('id', sessionId)

    if (updateError) {
      logError('evaluate', 'update session status failed', { error: updateError.message })
    }
  }

  ok(res, {
    trialId,
    sessionId,
    dimensionScores,
    portrait,
    certScore,
    certification: certLevel
      ? { level: certLevel, certScore, issuedAt: new Date().toISOString().slice(0, 10) }
      : null,
    report: aiReport,
    integrity: {
      riskScore: cheatResult.riskScore,
      flags: cheatResult.flags,
      suspicious: cheatResult.suspicious,
    },
  })
})

export default router
