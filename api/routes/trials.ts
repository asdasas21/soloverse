import { Router, type Request, type Response } from 'express'

const router = Router()

interface Trial {
  id: string
  title: string
  description: string
  type: string
  difficulty: string
  duration: string
  participants: number
}

const trials: Trial[] = [
  { id: 'hackathon-1', title: 'AI Agent 黑客松', description: '48小时内完成一个AI Agent项目，从零到可运行的MVP', type: 'hackathon', difficulty: 'intermediate', duration: '48小时', participants: 128 },
  { id: 'rag-1', title: 'RAG 系统搭建', description: '构建一个检索增强生成系统，展示你的技术深度', type: 'hackathon', difficulty: 'advanced', duration: '24小时', participants: 67 },
  { id: 'review-1', title: '代码审查挑战', description: '审查并改进一段生产级代码', type: 'code_review', difficulty: 'beginner', duration: '4小时', participants: 256 },
]

// In-memory sessions
const sessions = new Map<string, { trialId: string; startedAt: number }>()

/** GET /api/trials - list all trials */
router.get('/', (_req: Request, res: Response): void => {
  res.json({ success: true, data: trials })
})

/** GET /api/trials/:id - single trial */
router.get('/:id', (req: Request, res: Response): void => {
  const trial = trials.find((t) => t.id === req.params.id)
  if (!trial) {
    res.status(404).json({ success: false, error: 'Trial not found' })
    return
  }
  res.json({ success: true, data: trial })
})

/** POST /api/trials/:id/start - start a trial session */
router.post('/:id/start', (req: Request, res: Response): void => {
  const trial = trials.find((t) => t.id === req.params.id)
  if (!trial) {
    res.status(404).json({ success: false, error: 'Trial not found' })
    return
  }

  const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  sessions.set(sessionId, { trialId: trial.id, startedAt: Date.now() })

  res.json({
    success: true,
    data: {
      sessionId,
      greeting: `欢迎参加「${trial.title}」！我是你的 AI 导师，有任何问题都可以随时问我。准备好了就开始吧！`,
    },
  })
})

export default router
