import { Router, type Request, type Response } from 'express'
import { supabase } from '../lib/supabase.js'
import { ok, err } from '../lib/response.js'
import { logError } from '../lib/logger.js'

const router = Router()

/** GET /api/leaderboard — 能力排行榜（仅真实数据，不注入假种子） */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)

  const { data: evals, error } = await supabase
    .from('evaluations')
    .select(`
      user_id,
      cert_score,
      cert_level,
      portrait,
      created_at,
      profiles!inner(display_name, avatar_url, title)
    `)
    .order('cert_score', { ascending: false })
    .limit(limit * 3) // 多取以便去重后仍够数

  if (error) {
    logError('leaderboard', 'query failed', { error: error.message })
    err(res, 'Failed to load leaderboard', 500)
    return
  }

  // 每个用户只取最高分的一条
  const seen = new Set<string>()
  const rankings = (evals ?? [])
    .filter((e: any) => {
      if (seen.has(e.user_id)) return false
      seen.add(e.user_id)
      return true
    })
    .slice(0, limit)
    .map((e: any, i: number) => ({
      rank: i + 1,
      userId: e.user_id,
      displayName: e.profiles?.display_name || '匿名用户',
      avatarUrl: e.profiles?.avatar_url,
      title: e.profiles?.title || '',
      certScore: Math.round(Number(e.cert_score)),
      certLevel: e.cert_level,
      evaluatedAt: (e.created_at as string)?.slice(0, 10),
    }))

  ok(res, { rankings, total: rankings.length })
})

export default router
