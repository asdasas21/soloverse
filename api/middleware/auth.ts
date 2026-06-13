import type { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'

let _adminClient: ReturnType<typeof createClient> | null = null

function getAdminClient() {
  if (!_adminClient) {
    const url = process.env.SUPABASE_URL || ''
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    _adminClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  }
  return _adminClient
}

/**
 * 从请求中提取已认证的用户 ID
 * 优先验证 JWT token，回退到 x-user-id header（兼容期）
 */
export async function getAuthenticatedUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const { data: { user } } = await getAdminClient().auth.getUser(token)
      if (user?.id) return user.id
    } catch {
      // Token invalid, fall through
    }
  }
  // Fallback: x-user-id header (backward compat)
  const userId = req.headers['x-user-id'] as string | undefined
  if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return userId
  }
  return null
}
