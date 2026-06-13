import { Router, type Request, type Response } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// 模拟竞争者种子数据（仅在真实数据不足时补充）
const SEED_DATA = [
  { displayName: 'Alex Chen', title: '全栈架构师', certScore: 92, certLevel: 'C3' },
  { displayName: '林晓雯', title: 'AI 算法工程师', certScore: 88, certLevel: 'C3' },
  { displayName: 'Marcus L.', title: '资深后端开发', certScore: 84, certLevel: 'C2' },
  { displayName: '王思远', title: 'DevOps 专家', certScore: 81, certLevel: 'C2' },
  { displayName: 'Sarah K.', title: '前端技术专家', certScore: 78, certLevel: 'C2' },
  { displayName: '赵明轩', title: '数据工程师', certScore: 75, certLevel: 'C2' },
  { displayName: 'David P.', title: '系统架构师', certScore: 72, certLevel: 'C1' },
  { displayName: '刘雨桐', title: '云原生开发', certScore: 69, certLevel: 'C1' },
  { displayName: 'Emma R.', title: '安全工程师', certScore: 66, certLevel: 'C1' },
  { displayName: '陈浩然', title: '后端开发工程师', certScore: 63, certLevel: 'C1' },
]

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

  // 仅当真实数据不足时，补充种子数据
  let allRankings = rankings
  if (rankings.length < limit) {
    const today = new Date().toISOString().slice(0, 10)
    const needed = Math.min(SEED_DATA.length, limit - rankings.length)
    const seedRankings = SEED_DATA.slice(0, needed).map((s) => ({
      rank: 0,
      userId: 'seed',
      displayName: s.displayName,
      avatarUrl: undefined,
      title: s.title,
      certScore: s.certScore,
      certLevel: s.certLevel,
      evaluatedAt: today,
    }))
    allRankings = [...rankings, ...seedRankings]
      .sort((a, b) => b.certScore - a.certScore)
      .map((r, i) => ({ ...r, rank: i + 1 }))
  }

  res.json({
    success: true,
    data: {
      rankings: allRankings,
      total: allRankings.length,
    },
  })
})

export default router
