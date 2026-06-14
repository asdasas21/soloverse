/**
 * 结构化日志 — 基于 pino
 * 开发环境使用 pino-pretty 可读输出，生产环境输出 JSON
 */
import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDev
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
    : undefined,
})

/** HTTP 请求日志 */
export function logRequest(method: string, path: string, status: number, duration: number, ip?: string): void {
  logger.info({ method, path, status, duration, ip }, 'request')
}

/** API 错误日志（替代 console.error） */
export function logError(scope: string, message: string, extra?: Record<string, unknown>): void {
  logger.error({ scope, ...extra }, message)
}
