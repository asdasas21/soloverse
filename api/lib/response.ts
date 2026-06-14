/**
 * 统一 API 响应工具
 * 所有路由使用这些函数返回数据，确保格式一致
 */
import type { Response } from 'express'

export function ok<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({ success: true, data })
}

export function err(res: Response, message: string, status = 400): Response {
  return res.status(status).json({ success: false, error: message })
}

export function notFound(res: Response, message = '资源不存在'): Response {
  return res.status(404).json({ success: false, error: message })
}

export function unauthorized(res: Response, message = '请先登录'): Response {
  return res.status(401).json({ success: false, error: message })
}

export function forbidden(res: Response, message = '无权访问'): Response {
  return res.status(403).json({ success: false, error: message })
}

export function tooMany(res: Response, message = '请求过于频繁'): Response {
  return res.status(429).json({ success: false, error: message })
}
