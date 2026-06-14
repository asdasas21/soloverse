/**
 * 商业化路由 — 模拟支付 + 订阅管理 + 增值报告 + API计量
 */
import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { getAdminClient, getUserClient, requireEnterpriseRole } from '../middleware/auth.js'
import { ok, err, notFound, unauthorized, forbidden } from '../lib/response.js'
import { validateBody } from '../lib/validate.js'
import { logError } from '../lib/logger.js'
import { callGLM } from '../lib/glm.js'

const router = Router()

// ==========================================
// 订阅计划定义
// ==========================================
const PLANS = {
  free:       { name: '免费版',     price: 0,     seats: 1,   verifications: 5,   apiCalls: 50,    features: ['基础证书验证', '每日5次查看'] },
  starter:    { name: '入门版',     price: 9900,  seats: 5,   verifications: 50,  apiCalls: 500,   features: ['50次/月证书验证', '5个席位', '基础候选人搜索'] },
  pro:        { name: '专业版',     price: 29900, seats: 20,  verifications: 200, apiCalls: 2000,  features: ['200次/月验证', '20个席位', '高级搜索+导出', '优先支持'] },
  enterprise: { name: '企业版',     price: 99900, seats: 100, verifications: 1000,apiCalls: 10000, features: ['无限验证', '100席位', 'API接入', '专属客户经理', '定制试炼'] },
} as const

// C端增值产品
const REPORT_PRODUCTS = {
  career_diagnosis: { name: '深度职业诊断报告', price: 990, description: '基于六维画像的职业发展深度分析' },
  skill_gap:        { name: '技能差距分析',     price: 1490, description: '目标岗位的能力差距与学习路径' },
  interview_prep:   { name: '面试准备指南',     price: 1990, description: '基于画像的个性化面试准备方案' },
} as const

// ==========================================
// 工具函数
// ==========================================

function generateOrderNo(): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `TX${ts.toUpperCase()}${rand.toUpperCase()}`
}

/** 查询或创建用户的订阅记录 */
async function getOrCreateSubscription(userId: string) {
  const admin = getAdminClient()
  const { data: existing } = await admin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) return existing

  // 创建免费订阅
  const { data: created } = await admin
    .from('subscriptions')
    .insert({
      user_id: userId,
      plan: 'free',
      status: 'active',
      seats: PLANS.free.seats,
      verifications_per_month: PLANS.free.verifications,
      api_calls_per_month: PLANS.free.apiCalls,
    })
    .select('*')
    .single()

  return created
}

/** 检查当月 API 调用量 */
export async function checkApiQuota(userId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const admin = getAdminClient()
  const sub = await getOrCreateSubscription(userId)
  const limit = sub?.api_calls_per_month ?? PLANS.free.apiCalls

  // 计算当月用量
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { count } = await admin
    .from('api_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', monthStart)

  const used = count ?? 0
  return { allowed: used < limit, used, limit }
}

/** 记录 API 调用计量 */
export async function recordApiUsage(userId: string, endpoint: string, tokensUsed = 0, durationMs = 0): Promise<void> {
  const admin = getAdminClient()
  await admin.from('api_usage').insert({
    user_id: userId,
    endpoint,
    method: 'POST',
    tokens_used: tokensUsed,
    duration_ms: durationMs,
  })
}

/** 检查企业验证配额 */
export async function checkVerificationQuota(userId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const admin = getAdminClient()
  const sub = await getOrCreateSubscription(userId)
  const limit = sub?.verifications_per_month ?? PLANS.free.verifications

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { count } = await admin
    .from('api_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('endpoint', '/api/enterprise/verify')
    .gte('created_at', monthStart)

  const used = count ?? 0
  return { allowed: used < limit, used, limit }
}

// ==========================================
// 路由：订阅管理
// ==========================================

/** GET /api/commerce/plans — 获取所有订阅计划 */
router.get('/plans', (_req: Request, res: Response): void => {
  ok(res, {
    plans: Object.entries(PLANS).map(([key, plan]) => ({
      id: key,
      ...plan,
      priceYuan: (plan.price / 100).toFixed(2),
    })),
    reports: Object.entries(REPORT_PRODUCTS).map(([key, product]) => ({
      id: key,
      ...product,
      priceYuan: (product.price / 100).toFixed(2),
    })),
  })
})

/** GET /api/commerce/subscription — 获取当前用户的订阅状态 */
router.get('/subscription', async (req: Request, res: Response): Promise<void> => {
  const authResult = await getUserClient(req)
  if (!authResult) {
    unauthorized(res)
    return
  }

  const sub = await getOrCreateSubscription(authResult.userId)
  const quota = await checkApiQuota(authResult.userId)

  ok(res, {
    subscription: {
      plan: sub?.plan ?? 'free',
      status: sub?.status ?? 'active',
      seats: sub?.seats ?? 1,
      expiresAt: sub?.expires_at ? (sub.expires_at as string).slice(0, 10) : null,
    },
    usage: quota,
    planDetails: PLANS[sub?.plan as keyof typeof PLANS] ?? PLANS.free,
  })
})

// ==========================================
// 路由：模拟支付
// ==========================================

const createOrderSchema = z.object({
  productType: z.enum(['subscription', 'report', 'verification_pack']),
  productId: z.string().min(1),
})

/** POST /api/commerce/orders — 创建支付订单 */
router.post('/orders', validateBody(createOrderSchema), async (req: Request, res: Response): Promise<void> => {
  const authResult = await getUserClient(req)
  if (!authResult) {
    unauthorized(res)
    return
  }

  const { productType, productId } = req.body
  let amount = 0
  let metadata: Record<string, unknown> = {}

  if (productType === 'subscription') {
    const plan = PLANS[productId as keyof typeof PLANS]
    if (!plan) {
      err(res, '无效的订阅计划')
      return
    }
    amount = plan.price
    metadata = { planName: plan.name, seats: plan.seats }
  } else if (productType === 'report') {
    const product = REPORT_PRODUCTS[productId as keyof typeof REPORT_PRODUCTS]
    if (!product) {
      err(res, '无效的报告产品')
      return
    }
    amount = product.price
    metadata = { reportName: product.name }
  } else {
    err(res, '暂不支持该产品类型')
    return
  }

  const orderNo = generateOrderNo()
  const admin = getAdminClient()

  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      user_id: authResult.userId,
      order_no: orderNo,
      product_type: productType,
      product_id: productId,
      amount,
      currency: 'CNY',
      status: 'pending',
      pay_method: 'mock',
      metadata,
    })
    .select('*')
    .single()

  if (orderError || !order) {
    logError('commerce', 'create order failed', { error: orderError?.message })
    err(res, '创建订单失败', 500)
    return
  }

  ok(res, {
    orderId: order.id,
    orderNo: order.order_no,
    amount,
    amountYuan: (amount / 100).toFixed(2),
    productType,
    productId,
    // 模拟支付：直接返回支付完成信息（前端可模拟支付流程）
    mockPayment: {
      url: `/api/commerce/orders/${order.id}/pay`,
      method: 'POST',
      message: '模拟支付 — 点击确认即可完成支付',
    },
  })
})

/** POST /api/commerce/orders/:id/pay — 模拟支付确认 */
router.post('/orders/:id/pay', async (req: Request, res: Response): Promise<void> => {
  const authResult = await getUserClient(req)
  if (!authResult) {
    unauthorized(res)
    return
  }

  const admin = getAdminClient()
  const { data: order } = await admin
    .from('orders')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', authResult.userId)
    .maybeSingle()

  if (!order) {
    notFound(res, '订单不存在')
    return
  }

  if (order.status === 'paid') {
    err(res, '该订单已支付')
    return
  }

  // 模拟支付成功 — 更新订单状态
  await admin
    .from('orders')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', order.id)

  // 根据产品类型执行后续逻辑
  if (order.product_type === 'subscription') {
    const plan = PLANS[order.product_id as keyof typeof PLANS]
    if (plan) {
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + 1)

      // upsert 订阅记录
      const { data: existingSub } = await admin
        .from('subscriptions')
        .select('id')
        .eq('user_id', authResult.userId)
        .maybeSingle()

      if (existingSub) {
        await admin
          .from('subscriptions')
          .update({
            plan: order.product_id,
            status: 'active',
            seats: plan.seats,
            verifications_per_month: plan.verifications,
            api_calls_per_month: plan.apiCalls,
            expires_at: expiresAt.toISOString(),
          })
          .eq('id', existingSub.id)
      } else {
        await admin.from('subscriptions').insert({
          user_id: authResult.userId,
          plan: order.product_id,
          status: 'active',
          seats: plan.seats,
          verifications_per_month: plan.verifications,
          api_calls_per_month: plan.apiCalls,
          expires_at: expiresAt.toISOString(),
        })
      }

      ok(res, {
        paid: true,
        orderNo: order.order_no,
        productType: 'subscription',
        plan: order.product_id,
        planName: plan.name,
        expiresAt: expiresAt.toISOString().slice(0, 10),
      })
      return
    }
  }

  // 报告类产品 — 支付成功后标记，报告内容通过单独接口生成
  ok(res, {
    paid: true,
    orderNo: order.order_no,
    productType: order.product_type,
    productId: order.product_id,
    nextStep: order.product_type === 'report'
      ? `调用 POST /api/commerce/reports/${order.product_id}/generate 生成报告`
      : null,
  })
})

/** GET /api/commerce/orders — 获取用户订单列表 */
router.get('/orders', async (req: Request, res: Response): Promise<void> => {
  const authResult = await getUserClient(req)
  if (!authResult) {
    unauthorized(res)
    return
  }

  const admin = getAdminClient()
  const { data: orders } = await admin
    .from('orders')
    .select('*')
    .eq('user_id', authResult.userId)
    .order('created_at', { ascending: false })
    .limit(50)

  ok(res, (orders ?? []).map((o: any) => ({
    id: o.id,
    orderNo: o.order_no,
    productType: o.product_type,
    productId: o.product_id,
    amount: o.amount,
    amountYuan: (o.amount / 100).toFixed(2),
    status: o.status,
    paidAt: o.paid_at ? (o.paid_at as string).slice(0, 10) : null,
    createdAt: (o.created_at as string).slice(0, 10),
  })))
})

// ==========================================
// 路由：C端增值报告生成
// ==========================================

const generateReportSchema = z.object({
  evaluationId: z.string().uuid().optional(),
})

/** POST /api/commerce/reports/:type/generate — 生成增值报告 */
router.post('/reports/:type/generate', validateBody(generateReportSchema), async (req: Request, res: Response): Promise<void> => {
  const authResult = await getUserClient(req)
  if (!authResult) {
    unauthorized(res)
    return
  }

  const reportType = req.params.type
  const product = REPORT_PRODUCTS[reportType as keyof typeof REPORT_PRODUCTS]
  if (!product) {
    err(res, '无效的报告类型')
    return
  }

  // 检查是否已购买
  const admin = getAdminClient()
  const { data: paidOrder } = await admin
    .from('orders')
    .select('id')
    .eq('user_id', authResult.userId)
    .eq('product_type', 'report')
    .eq('product_id', reportType)
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!paidOrder) {
    forbidden(res, '请先购买该报告')
    return
  }

  // 检查是否已生成过
  const { data: existing } = await admin
    .from('report_purchases')
    .select('id, content')
    .eq('user_id', authResult.userId)
    .eq('report_type', reportType)
    .maybeSingle()

  if (existing?.content && Object.keys(existing.content).length > 0) {
    ok(res, { reportType, content: existing.content, cached: true })
    return
  }

  // 获取用户最新评估数据
  const { data: evaluation } = await admin
    .from('evaluations')
    .select('portrait, cert_score, cert_level, report, trial_id')
    .eq('user_id', authResult.userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!evaluation) {
    err(res, '请先完成至少一次试炼评估')
    return
  }

  // 根据报告类型生成 prompt
  const portrait = evaluation.portrait || {}
  const prompts: Record<string, string> = {
    career_diagnosis: `基于以下六维能力画像，生成一份深度职业诊断报告（中文）。
画像数据：${JSON.stringify(portrait)}
认证分数：${evaluation.cert_score}，等级：${evaluation.cert_level}

请返回 JSON：{
  "overview": "整体职业能力概述（100字）",
  "strengths": [{"dimension": "维度名", "analysis": "分析"}],
  "weaknesses": [{"dimension": "维度名", "analysis": "分析", "suggestion": "改进建议"}],
  "careerFit": [{"role": "适合的岗位", "matchScore": 85, "reason": "原因"}],
  "actionPlan": [{"phase": "阶段", "goals": ["目标"], "timeline": "1-3个月"}]
}`,

    skill_gap: `基于以下能力画像，分析用户与高级工程师岗位的技能差距。
画像数据：${JSON.stringify(portrait)}

请返回 JSON：{
  "targetRole": "高级全栈工程师",
  "currentLevel": "当前能力评估",
  "gaps": [{"skill": "技能名", "currentLevel": 60, "targetLevel": 85, "gap": 25, "priority": "high|medium|low"}],
  "learningPath": [{"step": 1, "focus": "重点", "resources": ["资源建议"], "estimatedTime": "2周"}],
  "milestones": [{"milestone": "里程碑", "criteria": "达成标准"}]
}`,

    interview_prep: `基于以下能力画像，生成个性化的面试准备方案。
画像数据：${JSON.stringify(portrait)}
认证等级：${evaluation.cert_level}

请返回 JSON：{
  "overallStrategy": "面试总体策略（100字）",
  "keyTalkingPoints": ["核心亮点1", "核心亮点2", "核心亮点3"],
  "weaknessMitigation": [{"weakness": "弱项", "strategy": "如何应对面试官追问"}],
  "mockQuestions": [{"question": "问题", "intent": "考察点", "tip": "回答技巧"}],
  "checklist": ["面试前准备事项"]
}`,
  }

  try {
    const raw = await callGLM(
      [
        { role: 'system', content: '你是一位资深职业顾问和技术面试官。请基于用户的能力画像数据生成专业、可操作的建议。必须返回合法的 JSON。' },
        { role: 'user', content: prompts[reportType] },
      ],
      { temperature: 0.5, responseFormat: 'json' }
    )

    const content = JSON.parse(raw)

    // 存储报告
    if (existing) {
      await admin.from('report_purchases').update({ content }).eq('id', existing.id)
    } else {
      await admin.from('report_purchases').insert({
        user_id: authResult.userId,
        evaluation_id: req.body.evaluationId ?? null,
        report_type: reportType,
        order_id: paidOrder.id,
        content,
      })
    }

    ok(res, { reportType, content, cached: false })
  } catch (genErr) {
    logError('commerce', 'report generation failed', { error: String(genErr) })
    err(res, '报告生成失败，请稍后重试', 500)
  }
})

/** GET /api/commerce/reports — 获取用户已购报告列表 */
router.get('/reports', async (req: Request, res: Response): Promise<void> => {
  const authResult = await getUserClient(req)
  if (!authResult) {
    unauthorized(res)
    return
  }

  const admin = getAdminClient()
  const { data: reports } = await admin
    .from('report_purchases')
    .select('id, report_type, created_at')
    .eq('user_id', authResult.userId)
    .order('created_at', { ascending: false })

  ok(res, (reports ?? []).map((r: any) => ({
    id: r.id,
    reportType: r.report_type,
    reportName: REPORT_PRODUCTS[r.report_type as keyof typeof REPORT_PRODUCTS]?.name ?? r.report_type,
    createdAt: (r.created_at as string).slice(0, 10),
  })))
})

/** GET /api/commerce/reports/:type — 获取已购报告内容 */
router.get('/reports/:type', async (req: Request, res: Response): Promise<void> => {
  const authResult = await getUserClient(req)
  if (!authResult) {
    unauthorized(res)
    return
  }

  const admin = getAdminClient()
  const { data: report } = await admin
    .from('report_purchases')
    .select('id, content, report_type, created_at')
    .eq('user_id', authResult.userId)
    .eq('report_type', req.params.type)
    .maybeSingle()

  if (!report) {
    notFound(res, '报告不存在或未购买')
    return
  }

  ok(res, {
    id: report.id,
    reportType: report.report_type,
    content: report.content,
    createdAt: (report.created_at as string).slice(0, 10),
  })
})

// ==========================================
// 路由：API 用量统计（企业端）
// ==========================================

/** GET /api/commerce/usage — 获取当前月 API 用量统计 */
router.get('/usage', requireEnterpriseRole, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string
  const admin = getAdminClient()

  const apiQuota = await checkApiQuota(userId)
  const verifyQuota = await checkVerificationQuota(userId)

  // 按天统计当月用量
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { data: dailyUsage } = await admin
    .from('api_usage')
    .select('endpoint, created_at, tokens_used')
    .eq('user_id', userId)
    .gte('created_at', monthStart)
    .order('created_at', { ascending: true })

  // 按天聚合
  const byDay: Record<string, number> = {}
  const byEndpoint: Record<string, number> = {}
  for (const u of dailyUsage ?? []) {
    const day = (u.created_at as string).slice(0, 10)
    byDay[day] = (byDay[day] ?? 0) + 1
    byEndpoint[u.endpoint] = (byEndpoint[u.endpoint] ?? 0) + 1
  }

  ok(res, {
    apiCalls: apiQuota,
    verifications: verifyQuota,
    dailyBreakdown: byDay,
    endpointBreakdown: byEndpoint,
    billingPeriod: monthStart.slice(0, 10),
  })
})

export default router
