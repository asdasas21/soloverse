import { Router, type Request, type Response } from 'express'

const router = Router()

function pickResponse(message: string): { text: string; shouldEvaluate: boolean } {
  const lower = message.toLowerCase()
  if (/代码|code|技术|架构|bug|实现|api|函数/.test(lower)) {
    return {
      text: '关于技术实现方面，我建议你可以从以下几个角度思考：\n\n1. 代码结构是否清晰，模块划分是否合理\n2. 错误处理和边界情况是否考虑充分\n3. 性能方面有没有可以优化的地方\n\n你可以把具体的代码片段发给我，我来帮你分析。',
      shouldEvaluate: true,
    }
  }
  if (/评估|评价|打分|分数|certif/.test(lower)) {
    return {
      text: '评估流程会从五个维度（D1-D5）对你的表现进行分析：\n\n- D1: 代码质量与工程实践\n- D2: 问题分析与解决能力\n- D3: 创新思维与方案设计\n- D4: 沟通与协作表现\n- D5: 时间管理与执行效率\n\n最终会生成你的个人画像和认证等级。完成后可以在个人主页查看。',
      shouldEvaluate: false,
    }
  }
  return {
    text: `你提到了「${message.slice(0, 20)}${message.length > 20 ? '...' : ''}」，这是一个很好的方向。\n\n在挑战过程中，我建议你多关注问题本身的核心难点，尝试从不同角度寻找解决方案。如果遇到困难，随时可以和我讨论。`,
    shouldEvaluate: true,
  }
}

/** POST /api/chat - SSE streaming chat */
router.post('/', (req: Request, res: Response): void => {
  const { sessionId, message } = req.body as { sessionId?: string; message?: string }

  if (!sessionId || !message) {
    res.status(400).json({ success: false, error: 'sessionId and message are required' })
    return
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const { text, shouldEvaluate } = pickResponse(message)
  let idx = 0

  const interval = setInterval(() => {
    if (idx < text.length) {
      const char = text[idx]
      res.write(`event: token\ndata: ${JSON.stringify({ token: char })}\n\n`)
      idx++
    } else {
      clearInterval(interval)

      if (shouldEvaluate) {
        const scores = {
          curiosity: Math.round(60 + Math.random() * 30),
          reliability: Math.round(60 + Math.random() * 30),
          factChecking: Math.round(60 + Math.random() * 30),
          diverseThinking: Math.round(60 + Math.random() * 30),
          uncertaintyTolerance: Math.round(60 + Math.random() * 30),
          lowEgoHighDrive: Math.round(60 + Math.random() * 30),
        }
        res.write(`event: evaluation\ndata: ${JSON.stringify(scores)}\n\n`)
      }

      res.write('event: done\ndata: {}\n\n')
      res.end()
    }
  }, 30)

  req.on('close', () => clearInterval(interval))
})

export default router
