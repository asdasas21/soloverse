import { Router, type Request, type Response } from 'express'

const router = Router()

const profiles: Record<string, object> = {
  'user-1': {
    id: 'user-1',
    name: '张三',
    portrait: { curiosity: 78, reliability: 85, factChecking: 72, diverseThinking: 88, uncertaintyTolerance: 65, lowEgoHighDrive: 82 },
    certification: { level: 'C2', certScore: 78.3, issuedAt: '2026-06-13' },
    trialHistory: [
      { trialId: 'hackathon-1', title: 'AI Agent 黑客松', score: 82, completedAt: '2026-06-10' },
      { trialId: 'review-1', title: '代码审查挑战', score: 75, completedAt: '2026-06-08' },
    ],
  },
}

/** GET /api/profile/:id */
router.get('/:id', (req: Request, res: Response): void => {
  const profile = profiles[req.params.id]
  if (!profile) {
    res.status(404).json({ success: false, error: 'Profile not found' })
    return
  }
  res.json({ success: true, data: profile })
})

export default router
