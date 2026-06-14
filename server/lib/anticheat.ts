/**
 * 防作弊引擎 — 行为一致性检测、时间异常检测
 * 在评估提交时执行，检测结果存入 evaluation 记录
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { logError } from './logger.js'

export interface CheatDetectionResult {
  suspicious: boolean
  riskScore: number // 0-100, 0=完全正常, 100=高度可疑
  flags: string[]
  details: Record<string, unknown>
}

/**
 * 检测时间异常
 * - 会话时间过短（< 2分钟）但对话轮数多 → 可疑
 * - 提交间隔异常（多轮对话间隔 < 1秒）→ 自动化脚本
 */
function detectTimeAnomaly(
  messages: Array<{ role: string; content: string }>,
  turnCount: number,
  sessionStartedAt: string | null
): { score: number; flags: string[] } {
  let score = 0
  const flags: string[] = []

  // 检查会话总时长
  if (sessionStartedAt) {
    const durationMs = Date.now() - new Date(sessionStartedAt).getTime()
    const durationMin = durationMs / (1000 * 60)

    if (turnCount >= 3 && durationMin < 1) {
      score += 40
      flags.push('session_too_short')
    } else if (turnCount >= 5 && durationMin < 2) {
      score += 20
      flags.push('session_short_for_turns')
    }
  }

  return { score: Math.min(score, 60), flags }
}

/**
 * 检测内容一致性
 * - 回答长度异常均匀 → 可能是模板
 * - 粘贴比例过高（依赖 coding_events）
 * - 回答重复度高
 */
function detectContentAnomaly(
  messages: Array<{ role: string; content: string }>
): { score: number; flags: string[] } {
  let score = 0
  const flags: string[] = []

  const userMessages = messages.filter((m) => m.role === 'user')

  if (userMessages.length >= 3) {
    // 检查回答长度方差
    const lengths = userMessages.map((m) => m.content.length)
    const avgLen = lengths.reduce((s, l) => s + l, 0) / lengths.length
    const variance = lengths.reduce((s, l) => s + (l - avgLen) ** 2, 0) / lengths.length
    const stdDev = Math.sqrt(variance)

    // 长度极度均匀（标准差 < 5 且平均长度 > 50）
    if (stdDev < 5 && avgLen > 50) {
      score += 25
      flags.push('uniform_response_length')
    }

    // 检查重复内容
    const contents = userMessages.map((m) => m.content.trim().toLowerCase())
    const uniqueContents = new Set(contents)
    if (contents.length > 3 && uniqueContents.size < contents.length * 0.7) {
      score += 30
      flags.push('repeated_responses')
    }

    // 检查是否包含典型的 AI 生成标记
    const aiMarkers = [/作为一个.*模型/, /我是一个.*AI/, /作为.*语言模型/, /I am.*AI.*model/]
    for (const msg of userMessages) {
      for (const marker of aiMarkers) {
        if (marker.test(msg.content)) {
          score += 15
          flags.push('ai_generated_marker')
          break
        }
      }
    }
  }

  return { score: Math.min(score, 50), flags }
}

/**
 * 检测编码行为异常（如果存在 coding_events 数据）
 * - 粘贴比例 > 60% → 可疑
 * - 搜索频率极低但结果分高 → 可疑
 */
async function detectBehaviorAnomaly(
  client: SupabaseClient,
  userId: string,
  sessionId: string
): Promise<{ score: number; flags: string[]; pasteRatio: number }> {
  let score = 0
  const flags: string[] = []
  let pasteRatio = 0

  try {
    const { data: events } = await client
      .from('coding_events')
      .select('event_type')
      .eq('session_id', sessionId)
      .eq('user_id', userId)

    if (events && events.length > 0) {
      const pasteCount = events.filter((e: any) => e.event_type === 'paste').length
      pasteRatio = pasteCount / events.length

      if (pasteRatio > 0.6) {
        score += 30
        flags.push('high_paste_ratio')
      } else if (pasteRatio > 0.4) {
        score += 15
        flags.push('moderate_paste_ratio')
      }

      // 搜索频率极低但代码量高
      const searchCount = events.filter((e: any) => e.event_type === 'search').length
      const editCount = events.filter((e: any) => e.event_type === 'edit').length
      if (editCount > 50 && searchCount === 0) {
        score += 10
        flags.push('no_search_activity')
      }
    }
  } catch (behaviorErr) {
    // coding_events 表可能不存在或无数据，忽略
    logError('anticheat', 'behavior detection skipped', { error: String(behaviorErr) })
  }

  return { score: Math.min(score, 40), flags, pasteRatio }
}

/**
 * 主入口：执行全面的防作弊检测
 */
export async function runCheatDetection(
  client: SupabaseClient,
  userId: string,
  sessionId: string,
  messages: Array<{ role: string; content: string }>,
  turnCount: number,
  sessionStartedAt: string | null
): Promise<CheatDetectionResult> {
  const timeResult = detectTimeAnomaly(messages, turnCount, sessionStartedAt)
  const contentResult = detectContentAnomaly(messages)
  const behaviorResult = await detectBehaviorAnomaly(client, userId, sessionId)

  const allFlags = [...timeResult.flags, ...contentResult.flags, ...behaviorResult.flags]
  const riskScore = Math.min(timeResult.score + contentResult.score + behaviorResult.score, 100)

  return {
    suspicious: riskScore >= 50,
    riskScore,
    flags: allFlags,
    details: {
      timeScore: timeResult.score,
      contentScore: contentResult.score,
      behaviorScore: behaviorResult.score,
      pasteRatio: behaviorResult.pasteRatio,
    },
  }
}
