/**
 * 任务协作路由 — Founder 发布任务、Builder 申请/提交、Founder 审批/评价
 */
import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { getUserClient } from '../middleware/auth.js'
import { ok, err, notFound, unauthorized, forbidden } from '../lib/response.js'
import { validateBody } from '../lib/validate.js'
import { logError } from '../lib/logger.js'

const router = Router()

// ── Schema 定义 ──

const createTaskSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  requirements: z.string().max(1000).optional(),
  applyDeadline: z.string().datetime().optional(),
  submitDeadline: z.string().datetime().optional(),
  maxBuilders: z.number().int().min(1).max(20).default(3),
  rewardTotal: z.number().int().min(0).default(0),
  depositRatio: z.number().int().min(0).max(100).default(30),
  category: z.string().default('general'),
  requiredCertLevel: z.enum(['C1', 'C2', 'C3']).nullable().default(null),
})

const applySchema = z.object({
  message: z.string().max(500).optional(),
})

const submitSchema = z.object({
  content: z.string().min(10).max(5000),
  attachments: z.array(z.record(z.string(), z.unknown())).default([]),
})

const reviewSchema = z.object({
  builderId: z.string().uuid(),
  professionalism: z.number().int().min(1).max(5),
  communication: z.number().int().min(1).max(5),
  quality: z.number().int().min(1).max(5),
  timeliness: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
})

// ── 任务 CRUD ──

/** GET /api/tasks — 浏览任务列表（公开） */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const authResult = await getUserClient(req)
  const supabase = authResult?.client ?? (await import('../lib/supabase.js')).supabase

  const status = (req.query.status as string) || 'open'
  const category = req.query.category as string
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)

  let query = supabase
    .from('tasks')
    .select(`
      *,
      creator:profiles!tasks_creator_id_fkey(display_name, avatar_url, title),
      _applications_count:task_applications(count)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status !== 'all') {
    query = query.eq('status', status)
  }
  if (category) {
    query = query.eq('category', category)
  }

  const { data: tasks, error } = await query

  if (error) {
    logError('tasks', 'list query failed', { error: error.message })
    err(res, '获取任务列表失败', 500)
    return
  }

  ok(res, { tasks: tasks ?? [] })
})

/** GET /api/tasks/:id — 任务详情 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const authResult = await getUserClient(req)
  const supabase = authResult?.client ?? (await import('../lib/supabase.js')).supabase

  const { data: task, error } = await supabase
    .from('tasks')
    .select(`
      *,
      creator:profiles!tasks_creator_id_fkey(display_name, avatar_url, title, bio)
    `)
    .eq('id', req.params.id)
    .maybeSingle()

  if (error || !task) {
    notFound(res, '任务不存在')
    return
  }

  ok(res, task)
})

/** POST /api/tasks — 创建任务（仅 enterprise 用户） */
router.post('/', validateBody(createTaskSchema), async (req: Request, res: Response): Promise<void> => {
  const authResult = await getUserClient(req)
  if (!authResult) {
    unauthorized(res, '需要登录后才能发布任务')
    return
  }
  const { client: supabase, userId } = authResult

  // 检查角色
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.role !== 'enterprise') {
    forbidden(res, '仅企业用户可以发布任务')
    return
  }

  const body = req.body
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      creator_id: userId,
      org_id: userId,
      title: body.title,
      description: body.description,
      requirements: body.requirements || null,
      apply_deadline: body.applyDeadline || null,
      submit_deadline: body.submitDeadline || null,
      max_builders: body.maxBuilders,
      reward_total: body.rewardTotal,
      deposit_ratio: body.depositRatio,
      category: body.category,
      required_cert_level: body.requiredCertLevel,
      status: 'open',
    })
    .select('*')
    .single()

  if (error || !task) {
    logError('tasks', 'create failed', { error: error?.message })
    err(res, '创建任务失败', 500)
    return
  }

  ok(res, task)
})

/** PATCH /api/tasks/:id — 更新任务状态（仅创建者） */
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const authResult = await getUserClient(req)
  if (!authResult) {
    unauthorized(res)
    return
  }
  const { client: supabase, userId } = authResult

  const { data: task } = await supabase
    .from('tasks')
    .select('creator_id, status')
    .eq('id', req.params.id)
    .maybeSingle()

  if (!task) {
    notFound(res, '任务不存在')
    return
  }
  if (task.creator_id !== userId) {
    forbidden(res, '只有任务发布者可以修改')
    return
  }

  const allowedFields = ['status', 'title', 'description', 'requirements', 'apply_deadline', 'submit_deadline']
  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field]
    }
  }

  const { data: updated, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', req.params.id)
    .select('*')
    .single()

  if (error) {
    err(res, '更新失败', 500)
    return
  }

  ok(res, updated)
})

// ── 任务申请 ──

/** POST /api/tasks/:id/apply — Builder 申请任务 */
router.post('/:id/apply', validateBody(applySchema), async (req: Request, res: Response): Promise<void> => {
  const authResult = await getUserClient(req)
  if (!authResult) {
    unauthorized(res, '需要登录后才能申请任务')
    return
  }
  const { client: supabase, userId } = authResult

  // 检查任务状态
  const { data: task } = await supabase
    .from('tasks')
    .select('status, max_builders, required_cert_level')
    .eq('id', req.params.id)
    .maybeSingle()

  if (!task) {
    notFound(res, '任务不存在')
    return
  }
  if (task.status !== 'open') {
    err(res, '该任务当前不接受申请')
    return
  }

  // 检查证书要求
  if (task.required_cert_level) {
    const { data: cert } = await supabase
      .from('certificates')
      .select('level')
      .eq('user_id', userId)
      .order('cert_score', { ascending: false })
      .limit(1)
      .maybeSingle()

    const levelOrder: Record<string, number> = { C1: 1, C2: 2, C3: 3 }
    const userLevel = cert ? (levelOrder[cert.level] || 0) : 0
    const requiredLevel = levelOrder[task.required_cert_level] || 0
    if (userLevel < requiredLevel) {
      forbidden(res, `该任务需要 ${task.required_cert_level} 及以上认证才能申请`)
      return
    }
  }

  // 检查是否已申请
  const { data: existing } = await supabase
    .from('task_applications')
    .select('id')
    .eq('task_id', req.params.id)
    .eq('builder_id', userId)
    .maybeSingle()

  if (existing) {
    err(res, '你已经申请过这个任务了')
    return
  }

  // 检查名额
  const { count } = await supabase
    .from('task_applications')
    .select('*', { count: 'exact', head: true })
    .eq('task_id', req.params.id)
    .eq('status', 'approved')

  if (count !== null && count >= task.max_builders) {
    err(res, '任务名额已满')
    return
  }

  const { data: application, error } = await supabase
    .from('task_applications')
    .insert({
      task_id: req.params.id,
      builder_id: userId,
      message: req.body.message || null,
    })
    .select('*')
    .single()

  if (error) {
    logError('tasks', 'apply failed', { error: error.message })
    err(res, '申请失败', 500)
    return
  }

  ok(res, application)
})

/** GET /api/tasks/:id/applications — 获取任务申请列表（仅创建者） */
router.get('/:id/applications', async (req: Request, res: Response): Promise<void> => {
  const authResult = await getUserClient(req)
  if (!authResult) {
    unauthorized(res)
    return
  }
  const { client: supabase, userId } = authResult

  const { data: task } = await supabase
    .from('tasks')
    .select('creator_id')
    .eq('id', req.params.id)
    .maybeSingle()

  if (!task) {
    notFound(res, '任务不存在')
    return
  }
  if (task.creator_id !== userId) {
    forbidden(res, '只有任务发布者可以查看申请')
    return
  }

  const { data: applications, error } = await supabase
    .from('task_applications')
    .select(`
      *,
      builder:profiles!task_applications_builder_id_fkey(display_name, avatar_url, title)
    `)
    .eq('task_id', req.params.id)
    .order('created_at', { ascending: false })

  if (error) {
    err(res, '获取申请列表失败', 500)
    return
  }

  ok(res, applications ?? [])
})

/** PATCH /api/tasks/:id/applications/:appId — 审批申请（仅创建者） */
router.patch('/:id/applications/:appId', async (req: Request, res: Response): Promise<void> => {
  const authResult = await getUserClient(req)
  if (!authResult) {
    unauthorized(res)
    return
  }
  const { client: supabase, userId } = authResult

  const { data: task } = await supabase
    .from('tasks')
    .select('creator_id')
    .eq('id', req.params.id)
    .maybeSingle()

  if (!task || task.creator_id !== userId) {
    forbidden(res, '无权操作')
    return
  }

  const { status } = req.body as { status: 'approved' | 'rejected' }
  if (!['approved', 'rejected'].includes(status)) {
    err(res, '无效的审批状态')
    return
  }

  const { data: updated, error } = await supabase
    .from('task_applications')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
    })
    .eq('id', req.params.appId)
    .select('*')
    .single()

  if (error) {
    err(res, '审批失败', 500)
    return
  }

  ok(res, updated)
})

// ── 任务提交 ──

/** POST /api/tasks/:id/submit — Builder 提交任务成果 */
router.post('/:id/submit', validateBody(submitSchema), async (req: Request, res: Response): Promise<void> => {
  const authResult = await getUserClient(req)
  if (!authResult) {
    unauthorized(res)
    return
  }
  const { client: supabase, userId } = authResult

  // 检查申请是否已通过
  const { data: application } = await supabase
    .from('task_applications')
    .select('status')
    .eq('task_id', req.params.id)
    .eq('builder_id', userId)
    .maybeSingle()

  if (!application || application.status !== 'approved') {
    forbidden(res, '你的申请尚未通过，无法提交')
    return
  }

  const { data: submission, error } = await supabase
    .from('task_submissions')
    .insert({
      task_id: req.params.id,
      builder_id: userId,
      content: req.body.content,
      attachments: req.body.attachments,
    })
    .select('*')
    .single()

  if (error) {
    err(res, '提交失败', 500)
    return
  }

  ok(res, submission)
})

/** GET /api/tasks/:id/submissions — 获取提交列表（仅创建者） */
router.get('/:id/submissions', async (req: Request, res: Response): Promise<void> => {
  const authResult = await getUserClient(req)
  if (!authResult) {
    unauthorized(res)
    return
  }
  const { client: supabase, userId } = authResult

  const { data: task } = await supabase
    .from('tasks')
    .select('creator_id')
    .eq('id', req.params.id)
    .maybeSingle()

  if (!task || task.creator_id !== userId) {
    forbidden(res, '只有任务发布者可以查看提交')
    return
  }

  const { data: submissions, error } = await supabase
    .from('task_submissions')
    .select(`
      *,
      builder:profiles!task_submissions_builder_id_fkey(display_name, avatar_url, title)
    `)
    .eq('task_id', req.params.id)
    .order('created_at', { ascending: false })

  if (error) {
    err(res, '获取提交列表失败', 500)
    return
  }

  ok(res, submissions ?? [])
})

/** PATCH /api/tasks/:id/submissions/:subId — 审批提交（创建者） */
router.patch('/:id/submissions/:subId', async (req: Request, res: Response): Promise<void> => {
  const authResult = await getUserClient(req)
  if (!authResult) {
    unauthorized(res)
    return
  }
  const { client: supabase, userId } = authResult

  const { data: task } = await supabase
    .from('tasks')
    .select('creator_id')
    .eq('id', req.params.id)
    .maybeSingle()

  if (!task || task.creator_id !== userId) {
    forbidden(res, '无权操作')
    return
  }

  const { status, feedback, rewardAmount } = req.body
  const updates: Record<string, unknown> = { reviewed_at: new Date().toISOString() }
  if (status) updates.status = status
  if (feedback !== undefined) updates.feedback = feedback
  if (rewardAmount !== undefined) updates.reward_amount = rewardAmount

  const { data: updated, error } = await supabase
    .from('task_submissions')
    .update(updates)
    .eq('id', req.params.subId)
    .select('*')
    .single()

  if (error) {
    err(res, '审批失败', 500)
    return
  }

  ok(res, updated)
})

// ── 任务评价 ──

/** POST /api/tasks/:id/reviews — 评价 Builder（仅创建者） */
router.post('/:id/reviews', validateBody(reviewSchema), async (req: Request, res: Response): Promise<void> => {
  const authResult = await getUserClient(req)
  if (!authResult) {
    unauthorized(res)
    return
  }
  const { client: supabase, userId } = authResult

  const { data: task } = await supabase
    .from('tasks')
    .select('creator_id')
    .eq('id', req.params.id)
    .maybeSingle()

  if (!task || task.creator_id !== userId) {
    forbidden(res, '只有任务发布者可以评价')
    return
  }

  const { builderId, professionalism, communication, quality, timeliness, comment } = req.body

  // 校验 Builder 是否有 approved 申请
  const { data: application } = await supabase
    .from('task_applications')
    .select('id')
    .eq('task_id', req.params.id)
    .eq('builder_id', builderId)
    .eq('status', 'approved')
    .maybeSingle()

  if (!application) {
    forbidden(res, '该用户未通过任务申请，无法评价')
    return
  }

  const { data: review, error } = await supabase
    .from('task_reviews')
    .insert({
      task_id: req.params.id,
      builder_id: builderId,
      reviewer_id: userId,
      professionalism,
      communication,
      quality,
      timeliness,
      comment: comment || null,
    })
    .select('*')
    .single()

  if (error) {
    err(res, '评价失败', 500)
    return
  }

  ok(res, review)
})

/** GET /api/tasks/:id/reviews — 获取任务评价 */
router.get('/:id/reviews', async (req: Request, res: Response): Promise<void> => {
  const authResult = await getUserClient(req)
  const supabase = authResult?.client ?? (await import('../lib/supabase.js')).supabase

  const { data: reviews, error } = await supabase
    .from('task_reviews')
    .select(`
      *,
      reviewer:profiles!task_reviews_reviewer_id_fkey(display_name, avatar_url),
      builder:profiles!task_reviews_builder_id_fkey(display_name, avatar_url)
    `)
    .eq('task_id', req.params.id)

  if (error) {
    err(res, '获取评价失败', 500)
    return
  }

  ok(res, reviews ?? [])
})

// ── 个人协作记录 ──

/** GET /api/tasks/my/participated — 我参与的任务 */
router.get('/my/participated', async (req: Request, res: Response): Promise<void> => {
  const authResult = await getUserClient(req)
  if (!authResult) {
    unauthorized(res)
    return
  }
  const { client: supabase, userId } = authResult

  const { data: applications } = await supabase
    .from('task_applications')
    .select(`
      status,
      task:tasks(*, creator:profiles!tasks_creator_id_fkey(display_name, avatar_url))
    `)
    .eq('builder_id', userId)
    .order('created_at', { ascending: false })

  ok(res, applications ?? [])
})

/** GET /api/tasks/my/created — 我创建的任务 */
router.get('/my/created', async (req: Request, res: Response): Promise<void> => {
  const authResult = await getUserClient(req)
  if (!authResult) {
    unauthorized(res)
    return
  }
  const { client: supabase, userId } = authResult

  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      *,
      _applications_count:task_applications(count)
    `)
    .eq('creator_id', userId)
    .order('created_at', { ascending: false })

  ok(res, tasks ?? [])
})

/** GET /api/tasks/my/reviews — 我收到的评价 */
router.get('/my/reviews', async (req: Request, res: Response): Promise<void> => {
  const authResult = await getUserClient(req)
  if (!authResult) {
    unauthorized(res)
    return
  }
  const { client: supabase, userId } = authResult

  const { data: reviews } = await supabase
    .from('task_reviews')
    .select(`
      *,
      task:tasks(title, category),
      reviewer:profiles!task_reviews_reviewer_id_fkey(display_name, avatar_url)
    `)
    .eq('builder_id', userId)
    .order('created_at', { ascending: false })

  ok(res, reviews ?? [])
})

export default router
