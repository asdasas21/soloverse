import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

/** Lazy-initialized Supabase client — waits until env vars are loaded */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_client) {
      const url = process.env.SUPABASE_URL || ''
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      if (!url || !key) {
        console.warn('[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — DB features disabled')
      }
      _client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    }
    return Reflect.get(_client, prop)
  },
})

// 六维分数类型
export interface Portrait {
  curiosity: number
  reliability: number
  factChecking: number
  diverseThinking: number
  uncertaintyTolerance: number
  lowEgoHighDrive: number
}

// 从数据库行提取 portrait
export function rowToPortrait(row: Record<string, number>): Portrait {
  return {
    curiosity: row.scores_curiosity ?? row.curiosity ?? 50,
    reliability: row.scores_reliability ?? row.reliability ?? 50,
    factChecking: row.scores_fact_checking ?? row.factChecking ?? 50,
    diverseThinking: row.scores_diverse_thinking ?? row.diverseThinking ?? 50,
    uncertaintyTolerance: row.scores_uncertainty_tolerance ?? row.uncertaintyTolerance ?? 50,
    lowEgoHighDrive: row.scores_low_ego_high_drive ?? row.lowEgoHighDrive ?? 50,
  }
}

// portrait 转数据库列前缀
export function portraitToRow(p: Portrait): Record<string, number> {
  return {
    scores_curiosity: p.curiosity,
    scores_reliability: p.reliability,
    scores_fact_checking: p.factChecking,
    scores_diverse_thinking: p.diverseThinking,
    scores_uncertainty_tolerance: p.uncertaintyTolerance,
    scores_low_ego_high_drive: p.lowEgoHighDrive,
  }
}

// 认证等级
export function getCertLevel(score: number): 'C1' | 'C2' | 'C3' | null {
  if (score >= 88) return 'C3'
  if (score >= 75) return 'C2'
  if (score >= 60) return 'C1'
  return null
}

// 计算综合分
export function computeCertScore(p: Portrait): number {
  const vals = Object.values(p)
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10
}

// 生成证书编号
export function generateCertNumber(level: string): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `TX-${year}-${level}-${random}`
}

// 生成验证码
export function generateVerificationCode(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 32)
}
