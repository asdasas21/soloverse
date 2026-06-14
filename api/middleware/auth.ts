import type { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase.js'

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

/**
 * 检查用户是否为企业端角色
 */
export async function isEnterpriseUser(userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  return profile?.role === 'enterprise'
}

/**
 * Express 中间件：要求企业端角色
 * 非企业端用户访问返回 403
 */
export async function requireEnterpriseRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = await getAuthenticatedUserId(req)
  if (!userId) {
    res.status(401).json({ success: false, error: '请先登录' })
    return
  }
  const isEnterprise = await isEnterpriseUser(userId)
  if (!isEnterprise) {
    res.status(403).json({ success: false, error: '该功能仅对企业端用户开放' })
    return
  }
  next()
}
