import { Router, type Request, type Response } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireEnterpriseRole } from '../middleware/auth.js'

const router = Router()

/**
 * GET /api/enterprise/verify/:certNumber
 * 企业端证书验证 — HR 输入证书编号验证候选人能力
 * 公开接口，无需认证
 */
router.get('/verify/:certNumber', async (req: Request, res: Response): Promise<void> => {
  const { certNumber } = req.params

  if (!certNumber) {
    res.status(400).json({ success: false, error: '证书编号不能为空' })
    return
  }

  const { data: cert, error } = await supabase
    .from('certificates')
    .select(`
      id,
      cert_number,
      level,
      cert_score,
      portrait,
      issued_at,
      is_revoked,
      trial_id,
      trials!inner(title),
      profiles!inner(display_name, title)
    `)
    .eq('cert_number', certNumber)
    .maybeSingle()

  if (error || !cert) {
    res.status(404).json({ success: false, error: '证书不存在或编号无效' })
    return
  }

  if (cert.is_revoked) {
    res.json({
      success: true,
      data: {
        valid: false,
        revoked: true,
        certNumber: cert.cert_number,
        message: '该证书已被撤销',
      },
    })
    return
  }

  // 返回企业验证所需的关键信息
  const levelNames: Record<string, string> = {
    C1: '基础认证',
    C2: '专业认证',
    C3: '专家认证',
  }

  res.json({
    success: true,
    data: {
      valid: true,
      revoked: false,
      certNumber: cert.cert_number,
      candidateName: (cert.profiles as any)?.display_name || '未知',
      candidateTitle: (cert.profiles as any)?.title || '',
      trialName: (cert.trials as any)?.title || '',
      level: cert.level,
      levelName: levelNames[cert.level] || cert.level,
      certScore: Number(cert.cert_score),
      portrait: cert.portrait,
      issuedAt: (cert.issued_at as string)?.slice(0, 10),
      verificationUrl: `https://soloverse.vercel.app/cert/${cert.cert_number}`,
    },
  })
})

/**
 * GET /api/enterprise/profile/:userId
 * 能力画像 API — 招聘平台集成接口
 * 需要提供 userId（通常由候选人主动分享）
 */
router.get('/profile/:userId', requireEnterpriseRole, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(userId)) {
    res.status(400).json({ success: false, error: '无效的用户 ID' })
    return
  }

  // 获取最新评估
  const { data: evaluation } = await supabase
    .from('evaluations')
    .select('portrait, cert_score, cert_level, summary, created_at, trial_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // 获取用户基本信息
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, title, bio')
    .eq('id', userId)
    .maybeSingle()

  // 获取所有证书
  const { data: certificates } = await supabase
    .from('certificates')
    .select('cert_number, level, cert_score, trial_id, issued_at')
    .eq('user_id', userId)
    .eq('is_revoked', false)
    .order('issued_at', { ascending: false })

  // 获取试炼历史
  const { data: sessions } = await supabase
    .from('trial_sessions')
    .select('id, trial_id, status, turn_count, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  res.json({
    success: true,
    data: {
      profile: {
        displayName: profile?.display_name || '匿名用户',
        title: profile?.title || '',
        bio: profile?.bio || '',
      },
      latestEvaluation: evaluation
        ? {
            portrait: evaluation.portrait,
            certScore: Number(evaluation.cert_score),
            certLevel: evaluation.cert_level,
            summary: evaluation.summary,
            evaluatedAt: (evaluation.created_at as string)?.slice(0, 10),
          }
        : null,
      certificates: (certificates || []).map((c: any) => ({
        certNumber: c.cert_number,
        level: c.level,
        certScore: Number(c.cert_score),
        trialId: c.trial_id,
        issuedAt: (c.issued_at as string)?.slice(0, 10),
        verifyUrl: `/api/enterprise/verify/${c.cert_number}`,
      })),
      trialHistory: (sessions || []).map((s: any) => ({
        trialId: s.trial_id,
        status: s.status,
        turnCount: s.turn_count,
        date: (s.created_at as string)?.slice(0, 10),
      })),
      stats: {
        totalTrials: sessions?.length || 0,
        completedTrials: sessions?.filter((s: any) => s.status === 'evaluated').length || 0,
        totalCertificates: certificates?.length || 0,
        highestLevel: certificates?.reduce((max: string, c: any) => {
          const order = { C3: 3, C2: 2, C1: 1 }
          return (order[c.level as keyof typeof order] || 0) > (order[max as keyof typeof order] || 0) ? c.level : max
        }, null as string) || null,
      },
    },
  })
})

/**
 * GET /api/enterprise/candidates
 * 获取候选人列表 — HR 浏览所有已认证用户
 */
router.get('/candidates', requireEnterpriseRole, async (_req: Request, res: Response): Promise<void> => {
  // 查询所有有评估数据的用户
  const { data: evaluations, error } = await supabase
    .from('evaluations')
    .select(`
      user_id,
      cert_score,
      cert_level,
      portrait,
      created_at,
      profiles!inner(display_name, title, bio)
    `)
    .order('cert_score', { ascending: false })
    .limit(50)

  if (error) {
    res.status(500).json({ success: false, error: error.message })
    return
  }

  // 去重：每个用户只取最高分的一次评估
  const seen = new Set<string>()
  const candidates = (evaluations || [])
    .filter((e: any) => {
      if (seen.has(e.user_id)) return false
      seen.add(e.user_id)
      return true
    })
    .map((e: any) => ({
      userId: e.user_id,
      displayName: e.profiles?.display_name || '匿名用户',
      title: e.profiles?.title || '',
      bio: e.profiles?.bio || '',
      certScore: Number(e.cert_score),
      certLevel: e.cert_level,
      portrait: e.portrait,
      evaluatedAt: (e.created_at as string)?.slice(0, 10),
    }))

  res.json({
    success: true,
    data: candidates,
    total: candidates.length,
    avgScore: candidates.length > 0
      ? Math.round(candidates.reduce((sum: number, c: any) => sum + c.certScore, 0) / candidates.length)
      : 0,
  })
})

/**
 * GET /api/enterprise/trials
 * 获取企业定制试炼列表
 */
router.get('/trials', async (_req: Request, res: Response): Promise<void> => {
  const { data: trials, error } = await supabase
    .from('trials')
    .select('id, title, description, difficulty, duration_hours, category')
    .order('created_at', { ascending: false })

  if (error) {
    res.status(500).json({ success: false, error: error.message })
    return
  }

  res.json({
    success: true,
    data: trials || [],
    total: trials?.length || 0,
  })
})

/**
 * POST /api/enterprise/trials
 * 企业发布定制试炼
 */
router.post('/trials', requireEnterpriseRole, async (req: Request, res: Response): Promise<void> => {
  const { title, description, difficulty, durationHours, category } = req.body

  if (!title || !description) {
    res.status(400).json({ success: false, error: '试炼标题和描述不能为空' })
    return
  }

  const { data, error } = await supabase
    .from('trials')
    .insert({
      title,
      description,
      difficulty: difficulty || '中级',
      duration_hours: durationHours || 4,
      category: category || '企业定制',
    })
    .select('id')
    .single()

  if (error) {
    res.status(500).json({ success: false, error: error.message })
    return
  }

  res.json({ success: true, data: { id: data.id, message: '试炼发布成功' } })
})

export default router
