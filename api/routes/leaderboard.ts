import { Router, type Request, type Response } from 'express'
import { supabase } from '../lib/supabase.js'
import { ok, err } from '../lib/response.js'
import { logError } from '../lib/logger.js'

const router = Router()

/** GET /api/leaderboard — 能力排行榜（仅真实数据，不注入假种子） */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
  const dimension = req.query.dimension as string | undefined

  const VALID_DIMENSIONS = [
    'curiosity', 'reliability', 'factChecking',
    'diverseThinking', 'uncertaintyTolerance', 'lowEgoHighDrive',
  ]

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
  let rankings: any[] = (evals ?? [])
    .filter((e: any) => {
      if (seen.has(e.user_id)) return false
      seen.add(e.user_id)
      return true
    })
    .map((e: any, i: number) => ({
      rank: i + 1,
      userId: e.user_id,
      displayName: e.profiles?.display_name || '匿名用户',
      avatarUrl: e.profiles?.avatar_url,
      title: e.profiles?.title || '',
      certScore: Math.round(Number(e.cert_score)),
      certLevel: e.cert_level,
      portrait: e.portrait,
      evaluatedAt: (e.created_at as string)?.slice(0, 10),
    }))

  // If dimension filter is requested, re-sort by that dimension
  if (dimension && VALID_DIMENSIONS.includes(dimension)) {
    rankings = rankings
      .map((r: any) => ({
        ...r,
        dimensionScore: r.portrait?.[dimension] ?? 0,
      }))
      .sort((a: any, b: any) => b.dimensionScore - a.dimensionScore)
      .map((r: any, i: number) => ({
        rank: i + 1,
        userId: r.userId,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl,
        title: r.title,
        certScore: r.dimensionScore,
        certLevel: r.certLevel,
        portrait: r.portrait,
        evaluatedAt: r.evaluatedAt,
      }))
  }

  rankings = rankings.slice(0, limit)

  ok(res, { rankings, total: rankings.length, dimension: dimension || null })
})

export default router
