import { Router, type Request, type Response } from 'express'
import { supabase } from '../lib/supabase.js'
import { logError } from '../lib/logger.js'

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
      profiles(display_name, username)
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
    logError('cert', 'query failed', { error: error.message })
    res.status(500).json({ success: false, error: 'Failed to load certificate' })
    return
  }

  if (!data) {
    res.status(404).json({ success: false, error: 'Certificate not found' })
    return
  }

  // Separate query for profile to avoid join issues
  const { data: profileData } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', data.user_id)
    .maybeSingle()

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

  res.json({
    success: true,
    data: {
      id: data.cert_number,
      userId: data.user_id,
      userName: profileData?.display_name || profileData?.username || 'TalentX 用户',
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
