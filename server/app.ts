/**
 * TalentX API Server — with security middleware
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import trialRoutes from './routes/trials.js'
import chatRoutes from './routes/chat.js'
import evaluateRoutes from './routes/evaluate.js'
import trialActionRoutes from './routes/trial-actions.js'
import profileRoutes from './routes/profile.js'
import seasonRoutes from './routes/season.js'
import certRoutes from './routes/cert.js'
import leaderboardRoutes from './routes/leaderboard.js'
import enterpriseRoutes from './routes/enterprise.js'
import skillsRouter, { codingEventsRouter } from './routes/skills.js'
import commerceRouter from './routes/commerce.js'
import taskRoutes from './routes/tasks.js'
import mcpRouter from './mcp-server.js'
import { logRequest, logError } from './lib/logger.js'

dotenv.config({ override: true })

const app: express.Application = express()

// --- Security: Helmet ---
app.use(helmet({
  contentSecurityPolicy: false, // Vite dev server needs inline scripts
  crossOriginEmbedderPolicy: false,
}))

// --- Security: CORS whitelist ---
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean) as string[]

app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin (no origin) and whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      // Don't throw Error — return null so browser handles CORS rejection natively
      callback(null, false)
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'authorization'],
  credentials: true,
}))

// --- Body parsing ---
app.use(express.json({ limit: '1mb' })) // Reduced from 10mb
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// --- Rate limiting: Global (per IP) ---
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, error: '请求过于频繁，请稍后再试' },
})
app.use('/api/', globalLimiter)

// --- Rate limiting: Chat (stricter — costs GLM API calls) ---
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 chat messages per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, error: '对话频率过高，请等待一分钟后再试' },
})

// --- Rate limiting: Evaluate (very strict — creates certificates) ---
const evaluateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 evaluations per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, error: '提交次数过多，请稍后再试' },
})

// --- Rate limiting: Trial actions (moderate — triggers GLM calls) ---
const trialActionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 actions per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, error: '操作频率过高，请稍后再试' },
})

/**
 * API Routes
 */
app.use('/api/trials', trialRoutes)
app.use('/api/chat', chatLimiter, chatRoutes)
// evaluateLimiter removed from app-level — auth check happens inside route handler,
// so unauthenticated requests don't consume the rate limit quota
app.use('/api/evaluate', evaluateRoutes)
app.use('/api/trial-actions', trialActionLimiter, trialActionRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/season', seasonRoutes)
app.use('/api/cert', certRoutes)
app.use('/api/leaderboard', leaderboardRoutes)
app.use('/api/enterprise', enterpriseRoutes)
app.use('/api/skills', skillsRouter)
app.use('/api/coding-events', codingEventsRouter)
app.use('/api/commerce', commerceRouter)
app.use('/api/tasks', taskRoutes)
app.use('/api/mcp', mcpRouter)

/**
 * Request logging middleware
 */
app.use((req: Request, _res: Response, next: NextFunction) => {
  const start = Date.now()
  _res.on('finish', () => {
    logRequest(req.method, req.path, _res.statusCode, Date.now() - start, req.ip)
  })
  next()
})

/**
 * Health check
 */
app.use('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'ok' })
})

/**
 * Error handler
 */
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  logError('server', error.message, { stack: error.stack })
  res.status(500).json({ success: false, error: '服务器内部错误' })
})

/**
 * 404 handler
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
