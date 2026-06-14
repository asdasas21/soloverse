import type { Request, Response, NextFunction } from 'express'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase.js'
import { unauthorized, forbidden } from '../lib/response.js'

let _adminClient: SupabaseClient | null = null

/** Admin client (service_role) — 仅用于无用户上下文的内部操作 */
export function getAdminClient(): SupabaseClient {
  if (!_adminClient) {
    const url = process.env.SUPABASE_URL || ''
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    _adminClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  }
  return _adminClient
}

/**
 * 从请求中提取已认证的用户 ID
 * 仅接受 JWT Bearer token，不再支持 x-user-id header（安全修复）
 */
export async function getAuthenticatedUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  try {
    const { data: { user } } = await getAdminClient().auth.getUser(token)
    return user?.id ?? null
  } catch {
    return null
  }
}

/**
 * 创建 per-request Supabase client（使用用户 JWT，让 RLS 策略生效）
 * 路由中用此 client 替代全局 supabase，确保数据隔离
 */
export async function getUserClient(req: Request): Promise<{ client: SupabaseClient; userId: string } | null> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  try {
    const { data: { user } } = await getAdminClient().auth.getUser(token)
    if (!user?.id) return null

    const url = process.env.SUPABASE_URL || ''
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
    const client = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    return { client, userId: user.id }
  } catch {
    return null
  }
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
 * Express 中间件：要求登录
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = await getAuthenticatedUserId(req)
  if (!userId) {
    unauthorized(res)
    return
  }
  ;(req as any).userId = userId
  next()
}

/**
 * Express 中间件：要求企业端角色
 */
export async function requireEnterpriseRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = await getAuthenticatedUserId(req)
  if (!userId) {
    unauthorized(res)
    return
  }
  const isEnt = await isEnterpriseUser(userId)
  if (!isEnt) {
    forbidden(res, '该功能仅对企业端用户开放')
    return
  }
  ;(req as any).userId = userId
  next()
}
