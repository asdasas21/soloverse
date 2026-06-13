import { Router, type Request, type Response } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// Matches UUID format
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** GET /api/cert/:id */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id

  let query = supabase
    .from('certificates')
    .select(`
      id,
      cert_number,
      user_id,
      level,
      cert_score,
      portrait,
      issued_at,
      verification_code,
      is_revoked,
      profiles!inner(display_name)
    `)
    .eq('is_revoked', false)

  // Decide lookup strategy: UUID -> by user_id (latest), otherwise -> by cert_number
  if (UUID_RE.test(id)) {
    query = query.eq('user_id', id).order('issued_at', { ascending: false }).limit(1)
  } else {
    query = query.eq('cert_number', id).limit(1)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    console.error('[cert] query failed:', error.message)
    res.status(500).json({ success: false, error: 'Failed to load certificate' })
    return
  }

  if (!data) {
    res.status(404).json({ success: false, error: 'Certificate not found' })
    return
  }

  // Compute valid-until date (1 year after issue)
  const issuedAt = new Date(data.issued_at as string)
  const validUntil = new Date(issuedAt)
  validUntil.setFullYear(validUntil.getFullYear() + 1)

  // levelName map
  const levelNameMap: Record<string, string> = {
    C1: '基础级',
    C2: '专业级',
    C3: '专家级',
  }

  // With limit(1) + maybeSingle, profiles is an array with at most one element
  const profileRows = data.profiles as Array<{ display_name: string }>
  const profile = profileRows && profileRows.length > 0 ? profileRows[0] : null

  res.json({
    success: true,
    data: {
      id: data.cert_number,
      userId: data.user_id,
      userName: profile?.display_name ?? '',
      level: data.level,
      levelName: levelNameMap[data.level] ?? data.level,
      certScore: data.cert_score,
      dimensions: data.portrait,
      issuedAt: issuedAt.toISOString().slice(0, 10),
      validUntil: validUntil.toISOString().slice(0, 10),
    },
  })
})

export default router
