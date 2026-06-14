import { Router, type Request, type Response } from 'express'

const router = Router()

// 赛季配置：每 3 个月一个赛季
const SEASONS = [
  { id: 'S1-2026', name: '2026 春季赛', startDate: '2026-01-01', endDate: '2026-03-31' },
  { id: 'S2-2026', name: '2026 夏季赛', startDate: '2026-04-01', endDate: '2026-06-30' },
  { id: 'S3-2026', name: '2026 秋季赛', startDate: '2026-07-01', endDate: '2026-09-30' },
  { id: 'S4-2026', name: '2026 冬季赛', startDate: '2026-10-01', endDate: '2026-12-31' },
]

// 获取当前赛季
function getCurrentSeason() {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  return SEASONS.find(s => today >= s.startDate && today <= s.endDate) || SEASONS[0]
}

// 计算剩余天数
function getDaysRemaining(season: typeof SEASONS[0]) {
  const end = new Date(season.endDate)
  const diff = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

/** GET /api/season/current */
router.get('/current', async (_req: Request, res: Response) => {
  const season = getCurrentSeason()
  const daysRemaining = getDaysRemaining(season)
  const totalDays = Math.ceil((new Date(season.endDate).getTime() - new Date(season.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
  const elapsedDays = totalDays - daysRemaining
  const progress = Math.round((elapsedDays / totalDays) * 100)

  res.json({
    success: true,
    data: {
      ...season,
      daysRemaining,
      progress,
      totalDays,
      elapsedDays,
    },
  })
})

export default router
