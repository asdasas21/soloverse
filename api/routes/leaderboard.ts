import { Router, type Request, type Response } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

/** GET /api/leaderboard — 能力排行榜 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)

  // 查询所有有评估记录的用户，取最高分
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
    .limit(limit)

  if (error) {
    console.error('[leaderboard] query failed:', error.message)
    res.status(500).json({ success: false, error: 'Failed to load leaderboard' })
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

  res.json({
    success: true,
    data: {
      rankings,
      total: rankings.length,
    },
  })
})

export default router
