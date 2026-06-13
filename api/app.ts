/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
// import authRoutes from './routes/auth.js' // disabled: stubs
import trialRoutes from './routes/trials.js'
import chatRoutes from './routes/chat.js'
import evaluateRoutes from './routes/evaluate.js'
import profileRoutes from './routes/profile.js'

// for esm mode
// const __filename = fileURLToPath(import.meta.url)
// const __dirname = path.dirname(__filename) // unused

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
// app.use('/api/auth', authRoutes) // auth routes are stubs, disabled to prevent hanging requests
app.use('/api/trials', trialRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/evaluate', evaluateRoutes)
app.use('/api/profile', profileRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, _next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
