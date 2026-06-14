/**
 * Zod 输入校验中间件
 * 用法: router.post('/', zodValidate(Schema), handler)
 */
import type { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'
import { err } from './response.js'

/** 校验 req.body，失败返回 400 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const firstError = result.error.issues[0]
      const message = firstError ? `${firstError.path.join('.')}: ${firstError.message}` : '输入校验失败'
      err(res, message, 422)
      return
    }
    req.body = result.data
    next()
  }
}

/** 校验 req.params，失败返回 400 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params)
    if (!result.success) {
      err(res, '无效的路径参数', 422)
      return
    }
    next()
  }
}
