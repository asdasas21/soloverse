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
import profileRoutes from './routes/profile.js'
import certRoutes from './routes/cert.js'
import leaderboardRoutes from './routes/leaderboard.js'
import enterpriseRoutes from './routes/enterprise.js'

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
      callback(null, true) // Permissive in dev; tighten for production
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'x-user-id'],
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
  message: { success: false, error: '请求过于频繁，请稍后再试' },
})
app.use('/api/', globalLimiter)

// --- Rate limiting: Chat (stricter — costs GLM API calls) ---
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 chat messages per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '对话频率过高，请等待一分钟后再试' },
})

// --- Rate limiting: Evaluate (very strict — creates certificates) ---
const evaluateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 evaluations per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '提交次数过多，请稍后再试' },
})

/**
 * API Routes
 */
app.use('/api/trials', trialRoutes)
app.use('/api/chat', chatLimiter, chatRoutes)
app.use('/api/evaluate', evaluateLimiter, evaluateRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/cert', certRoutes)
app.use('/api/leaderboard', leaderboardRoutes)
app.use('/api/enterprise', enterpriseRoutes)

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
  console.error('[server] Unhandled error:', error.message)
  res.status(500).json({ success: false, error: '服务器内部错误' })
})

/**
 * 404 handler
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
