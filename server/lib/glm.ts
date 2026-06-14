/**
 * GLM AI 客户端 — 统一的 LLM 调用入口
 * 所有路由通过此模块调用 AI，避免重复代码
 */

export interface GLMOptions {
  temperature?: number
  responseFormat?: 'text' | 'json'
  maxTokens?: number
}

/**
 * 调用智谱 GLM 模型
 * @throws Error 如果 API 调用失败
 */
export async function callGLM(
  messages: Array<{ role: string; content: string }>,
  options?: GLMOptions
): Promise<string> {
  const apiKey = process.env.ZHIPU_API_KEY
  const apiBase = process.env.ZHIPU_API_BASE || 'https://open.bigmodel.cn/api/paas/v4'
  const model = process.env.ZHIPU_MODEL || 'glm-4-flash'

  if (!apiKey) {
    throw new Error('ZHIPU_API_KEY is not configured')
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2048,
  }

  if (options?.responseFormat === 'json') {
    body.response_format = { type: 'json_object' }
  }

  const res = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`GLM API error: ${res.status} ${errText.slice(0, 200)}`)
  }

  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> }
  return data.choices[0].message.content
}

/**
 * 调用 GLM 并解析 JSON 结果（带 fallback）
 */
export async function callGLMJson<T = unknown>(
  messages: Array<{ role: string; content: string }>,
  options?: Omit<GLMOptions, 'responseFormat'>
): Promise<T> {
  const raw = await callGLM(messages, { ...options, responseFormat: 'json' })
  return JSON.parse(raw) as T
}

/**
 * 流式调用 GLM 模型，逐 token 回调
 * @param onToken 每收到一个 token 时调用
 */
export async function callGLMStream(
  messages: Array<{ role: string; content: string }>,
  onToken: (token: string) => void,
  options?: GLMOptions
): Promise<string> {
  const apiKey = process.env.ZHIPU_API_KEY
  const apiBase = process.env.ZHIPU_API_BASE || 'https://open.bigmodel.cn/api/paas/v4'
  const model = process.env.ZHIPU_MODEL || 'glm-4-flash'

  if (!apiKey) {
    throw new Error('ZHIPU_API_KEY is not configured')
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2048,
    stream: true,
  }

  const res = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`GLM API error: ${res.status} ${errText.slice(0, 200)}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let fullContent = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data)
        const token = parsed.choices?.[0]?.delta?.content
        if (token) {
          fullContent += token
          onToken(token)
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  return fullContent
}
