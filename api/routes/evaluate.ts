import { Router, type Request, type Response } from 'express'

const router = Router()

// --- Inline EMA engine (dimension scoring + portrait + cert) ---

type Dimension = 'curiosity' | 'reliability' | 'factChecking' | 'diverseThinking' | 'uncertaintyTolerance' | 'lowEgoHighDrive'

const DIMENSIONS: Dimension[] = ['curiosity', 'reliability', 'factChecking', 'diverseThinking', 'uncertaintyTolerance', 'lowEgoHighDrive']
const ALPHA = 0.3
const IMPLICIT_FACTOR = 0.15

interface EMAEvent { dimension: Dimension; scoreRaw: number; isImplicit?: boolean; timestamp: number }
interface Portrait { curiosity: number; reliability: number; factChecking: number; diverseThinking: number; uncertaintyTolerance: number; lowEgoHighDrive: number }

function computePortrait(events: EMAEvent[]): Portrait {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp)
  const ema = Object.fromEntries(DIMENSIONS.map((d) => [d, 0])) as Record<Dimension, number>
  const hasData = Object.fromEntries(DIMENSIONS.map((d) => [d, false])) as Record<Dimension, boolean>

  for (const ev of sorted) {
    const raw = Math.max(0, Math.min(1, ev.scoreRaw))
    const adjusted = ev.isImplicit ? raw * IMPLICIT_FACTOR : raw
    if (!hasData[ev.dimension]) { ema[ev.dimension] = adjusted; hasData[ev.dimension] = true }
    else { ema[ev.dimension] = ALPHA * adjusted + (1 - ALPHA) * ema[ev.dimension] }
  }

  const result = {} as Portrait
  for (const d of DIMENSIONS) (result as Record<Dimension, number>)[d] = Math.round(ema[d] * 100)
  return result
}

function getCertLevel(score: number): 'C1' | 'C2' | 'C3' | null {
  if (score >= 88) return 'C3'
  if (score >= 75) return 'C2'
  if (score >= 60) return 'C1'
  return null
}

// Map submission data → five dimension raw scores (D1-D5)
function computeDimensionScores(submission: { codeDiff: string; commitHistory: string[]; duration: number }): Record<string, number> {
  const lineCount = (submission.codeDiff ?? '').split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).length
  const commitCount = (submission.commitHistory ?? []).length
  const durationHours = submission.duration / 3600

  return {
    D1_codeQuality: Math.min(1, 0.4 + lineCount * 0.005 + Math.random() * 0.15),
    D2_problemSolving: Math.min(1, 0.5 + commitCount * 0.03 + Math.random() * 0.1),
    D3_innovation: Math.min(1, 0.45 + Math.random() * 0.3),
    D4_communication: Math.min(1, 0.5 + commitCount * 0.02 + Math.random() * 0.15),
    D5_execution: Math.min(1, 0.5 + (durationHours > 0 ? 1 / durationHours * 0.2 : 0) + Math.random() * 0.15),
  }
}

// D1-D5 → portrait dimension mapping weights
const D2PORTRAIT: Record<string, Partial<Record<Dimension, number>>> = {
  D1_codeQuality: { reliability: 0.4, factChecking: 0.3, curiosity: 0.1 },
  D2_problemSolving: { diverseThinking: 0.4, uncertaintyTolerance: 0.3, curiosity: 0.2 },
  D3_innovation: { diverseThinking: 0.3, curiosity: 0.4, lowEgoHighDrive: 0.1 },
  D4_communication: { lowEgoHighDrive: 0.4, reliability: 0.2, factChecking: 0.2 },
  D5_execution: { reliability: 0.3, lowEgoHighDrive: 0.3, uncertaintyTolerance: 0.2 },
}

/** POST /api/evaluate */
router.post('/', (req: Request, res: Response): void => {
  const { trialId, sessionId, submission } = req.body as {
    trialId?: string; sessionId?: string
    submission?: { codeDiff: string; commitHistory: string[]; duration: number }
  }

  if (!trialId || !sessionId || !submission) {
    res.status(400).json({ success: false, error: 'trialId, sessionId, and submission are required' })
    return
  }

  // Step 1: compute D1-D5
  const dScores = computeDimensionScores(submission)

  // Step 2: map D scores → EMA events for portrait
  const events: EMAEvent[] = []
  const now = Date.now()
  for (const [dKey, raw] of Object.entries(dScores)) {
    const weights = D2PORTRAIT[dKey] ?? {}
    for (const [dim, weight] of Object.entries(weights)) {
      events.push({ dimension: dim as Dimension, scoreRaw: raw * weight * 3, isImplicit: false, timestamp: now - Math.random() * 100000 })
    }
  }

  // Step 3: compute portrait
  const portrait = computePortrait(events)

  // Step 4: cert score & level
  const values = DIMENSIONS.map((d) => (portrait as Record<Dimension, number>)[d])
  const certScore = Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10
  const certLevel = getCertLevel(certScore)

  res.json({
    success: true,
    data: {
      trialId,
      sessionId,
      dimensionScores: Object.fromEntries(Object.entries(dScores).map(([k, v]) => [k, Math.round(v * 100)])),
      portrait,
      certification: certLevel
        ? { level: certLevel, certScore, issuedAt: new Date().toISOString().slice(0, 10) }
        : null,
    },
  })
})

export default router
