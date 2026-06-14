import { Router, type Request, type Response } from 'express'
import { supabase, computeCertScore, getCertLevel } from '../lib/supabase.js'

const router = Router()

/** 为用户创建试炼 + 评估 + 证书数据 */
async function seedEvaluationData(
  userId: string,
  portrait: Record<string, number>,
  trials: Array<{ trialId: string; score: number }>
) {
  let lastSessionId = ''
  let lastTrialId = ''

  for (const trial of trials) {
    const { data: session, error: sessionErr } = await supabase.from('trial_sessions').insert({
      user_id: userId,
      trial_id: trial.trialId,
      status: 'evaluated',
      started_at: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
      submitted_at: new Date(Date.now() - Math.random() * 6 * 86400000).toISOString(),
    }).select('id').single()

    if (sessionErr) {
      console.error(`[demo:seed] trial_sessions insert failed for ${trial.trialId}:`, sessionErr.message)
      continue
    }

    lastSessionId = session.id
    lastTrialId = trial.trialId

    if (session) {
      const { error: evalErr } = await supabase.from('evaluations').insert({
        user_id: userId,
        session_id: session.id,
        trial_id: trial.trialId,
        portrait,
        cert_score: trial.score,
        cert_level: getCertLevel(trial.score),
      })
      if (evalErr) {
        console.error(`[demo:seed] evaluations insert failed for ${trial.trialId}:`, evalErr.message)
      }
    }
  }

  const certScore = computeCertScore(portrait as any)
  const certLevel = getCertLevel(certScore)
  if (certLevel && lastSessionId) {
    // 获取最后创建的 evaluation ID
    const { data: lastEval } = await supabase
      .from('evaluations')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const { error: certErr } = await supabase.from('certificates').upsert({
      user_id: userId,
      cert_number: `TX-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      verification_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
      evaluation_id: lastEval?.id,
      trial_id: lastTrialId,
      level: certLevel,
      cert_score: Math.round(certScore),
      portrait,
      issued_at: new Date().toISOString(),
      is_revoked: false,
    })
    if (certErr) {
      console.error(`[demo:seed] certificate upsert failed:`, certErr.message)
    }
  }
}

/**
 * 演示账号预设数据
 * - high: C3 专家级 (88+)
 * - mid:  C2 专业级 (75+)
 * - low:  C1 基础级 (60+)
 * - enterprise: 企业端演示
 */
const DEMO_PROFILES: Record<string, {
  email: string
  password: string
  displayName: string
  title: string
  bio: string
  portrait: Record<string, number>
  trials: Array<{ trialId: string; score: number }>
}> = {
  high: {
    email: 'demo@talentx.dev',
    password: 'demo123456',
    displayName: '张三',
    title: '全栈工程师',
    bio: '5年开发经验，专注于前端工程化和AI应用开发。',
    portrait: {
      curiosity: 92,
      reliability: 90,
      factChecking: 88,
      diverseThinking: 91,
      uncertaintyTolerance: 87,
      lowEgoHighDrive: 93,
    },
    trials: [
      { trialId: 'code-review', score: 91 },
      { trialId: 'system-design', score: 89 },
      { trialId: 'rag-system', score: 88 },
      { trialId: 'hackathon-1', score: 93 },
    ],
  },
  mid: {
    email: 'mid@talentx.dev',
    password: 'mid123456',
    displayName: '李四',
    title: '后端开发工程师',
    bio: '3年开发经验，擅长 Java/Go 后端服务和微服务架构。',
    portrait: {
      curiosity: 76,
      reliability: 78,
      factChecking: 74,
      diverseThinking: 75,
      uncertaintyTolerance: 73,
      lowEgoHighDrive: 77,
    },
    trials: [
      { trialId: 'code-review', score: 76 },
      { trialId: 'debug-master', score: 74 },
      { trialId: 'api-design', score: 78 },
    ],
  },
  low: {
    email: 'low@talentx.dev',
    password: 'low123456',
    displayName: '王五',
    title: '初级前端开发',
    bio: '应届毕业生，正在积极提升技术能力。',
    portrait: {
      curiosity: 62,
      reliability: 65,
      factChecking: 58,
      diverseThinking: 61,
      uncertaintyTolerance: 60,
      lowEgoHighDrive: 64,
    },
    trials: [
      { trialId: 'code-review', score: 55 },
      { trialId: 'frontend-eng', score: 62 },
    ],
  },
  enterprise: {
    email: 'enterprise@talentx.dev',
    password: 'ent123456',
    displayName: '企业端管理员',
    title: 'HR 技术总监',
    bio: '某科技公司技术招聘负责人。',
    portrait: {
      curiosity: 0, reliability: 0, factChecking: 0,
      diverseThinking: 0, uncertaintyTolerance: 0, lowEgoHighDrive: 0,
    },
    trials: [],
  },
}

/**
 * POST /api/demo/seed — 为演示账号填充数据
 * 需要管理员密钥
 */
router.post('/seed', async (req: Request, res: Response): Promise<void> => {
  const adminKey = req.headers['x-admin-key']
  if (adminKey !== process.env.DEMO_ADMIN_KEY && adminKey !== 'talentx-demo-2026') {
    res.status(403).json({ success: false, error: '无权执行此操作' })
    return
  }

  const results: Array<{ type: string; status: string; message: string }> = []

  for (const [type, config] of Object.entries(DEMO_PROFILES)) {
    try {
      // 查询用户是否已存在
      const { data: existingUsers } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', config.displayName)
        .limit(1)

      const existingUserId = existingUsers && existingUsers.length > 0 ? existingUsers[0].id : null

      if (!existingUserId) {
        // 创建用户（通过 admin API）
        const { data: newData, error: createError } = await supabase.auth.admin.createUser({
          email: config.email,
          password: config.password,
          email_confirm: true,
          user_metadata: {
            username: config.displayName,
            display_name: config.displayName,
          },
        })

        if (createError || !newData?.user) {
          results.push({ type, status: 'error', message: `创建用户失败: ${createError?.message}` })
          continue
        }

        const userId = newData.user.id

        // 创建 profile
        await supabase.from('profiles').upsert({
          id: userId,
          username: config.displayName,
          display_name: config.displayName,
          title: config.title,
          bio: config.bio,
          role: type === 'enterprise' ? 'enterprise' : 'talent',
        })

        // 创建评估数据（仅非企业端）
        if (type !== 'enterprise' && config.portrait.curiosity > 0) {
          await seedEvaluationData(userId, config.portrait, config.trials)
        }

        results.push({ type, status: 'created', message: `${config.displayName} (${config.email}) 创建成功` })
      } else {
        // 用户已存在，更新数据
        const userId = existingUserId

        await supabase.from('profiles').upsert({
          id: userId,
          username: config.displayName,
          display_name: config.displayName,
          title: config.title,
          bio: config.bio,
          role: type === 'enterprise' ? 'enterprise' : 'talent',
        })

        if (type !== 'enterprise' && config.portrait.curiosity > 0) {
          // 删除旧评估
          await supabase.from('evaluations').delete().eq('user_id', userId)
          await supabase.from('trial_sessions').delete().eq('user_id', userId)
          await seedEvaluationData(userId, config.portrait, config.trials)
        }

        results.push({ type, status: 'updated', message: `${config.displayName} (${config.email}) 数据已更新` })
      }
    } catch (err: any) {
      results.push({ type, status: 'error', message: err.message })
    }
  }

  res.json({ success: true, data: { results } })
})

/**
 * GET /api/demo/accounts — 获取演示账号列表（公开）
 */
router.get('/accounts', (_req: Request, res: Response): void => {
  res.json({
    success: true,
    data: Object.entries(DEMO_PROFILES).map(([type, config]) => ({
      type,
      email: config.email,
      password: config.password,
      displayName: config.displayName,
      title: config.title,
      description: type === 'high' ? 'C3 专家级 · 完整数据' : type === 'mid' ? 'C2 专业级 · 中等数据' : type === 'low' ? 'C1 基础级 · 少量数据' : '企业端管理员',
    })),
  })
})

/**
 * POST /api/demo/update-user — 直接更新指定 userId 的数据
 */
router.post('/update-user', async (req: Request, res: Response): Promise<void> => {
  const adminKey = req.headers['x-admin-key']
  if (adminKey !== 'talentx-demo-2026') {
    res.status(403).json({ success: false, error: '无权执行此操作' })
    return
  }
  const { userId, type } = req.body as { userId: string; type: string }
  if (!userId || !type || !DEMO_PROFILES[type]) {
    res.status(400).json({ success: false, error: '需要 userId 和 type(high/mid/low)' })
    return
  }

  const config = DEMO_PROFILES[type]
  try {
    await supabase.from('profiles').upsert({
      id: userId,
      username: config.displayName,
      display_name: config.displayName,
      title: config.title,
      bio: config.bio,
    })

    // 删除旧评估
    await supabase.from('evaluations').delete().eq('user_id', userId)
    await supabase.from('trial_sessions').delete().eq('user_id', userId)

    if (config.portrait.curiosity > 0) {
      await seedEvaluationData(userId, config.portrait, config.trials)
    }

    res.json({ success: true, message: `${config.displayName} 数据已更新为 ${type} 级别` })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * POST /api/demo/seed-skills — 创建演示技能数据
 */
router.post('/seed-skills', async (req: Request, res: Response): Promise<void> => {
  const adminKey = req.headers['x-admin-key']
  if (adminKey !== 'talentx-demo-2026') {
    res.status(403).json({ success: false, error: '无权执行此操作' })
    return
  }

  // 使用高分演示用户作为技能作者
  const { data: authorProfile } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', '张三')
    .limit(1)

  const authorId = authorProfile?.[0]?.id
  if (!authorId) {
    res.status(400).json({ success: false, error: '演示用户不存在，请先执行 /demo/seed' })
    return
  }

  const demoSkills = [
    {
      title: '代码审查助手',
      description: '自动审查 PR 代码，检查常见 bug、安全漏洞和代码规范问题。支持 Java、Python、JavaScript、Go 等主流语言。',
      user_id: authorId,
      kind: 'api',
      protocol: {
        type: 'code-review',
        languages: ['java', 'python', 'javascript', 'go'],
        input_schema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: '需要审查的源代码内容',
            },
            language: {
              type: 'string',
              description: '代码语言，如 javascript、python',
            },
          },
          required: ['code'],
        },
        output_schema: {
          type: 'object',
          properties: {
            issues: {
              type: 'array',
              description: '发现的问题列表',
            },
            summary: {
              type: 'string',
              description: '总体评价',
            },
          },
        },
      },
      status: 'published',
      invoke_count: 42,
    },
    {
      title: '简历智能解析',
      description: '解析简历文本内容，提取技能、经验和教育信息，输出结构化 JSON 格式。支持中英文简历。（调用方需先将 PDF/Word 转为纯文本传入）',
      user_id: authorId,
      kind: 'api',
      protocol: {
        type: 'resume-parser',
        formats: ['pdf', 'docx'],
        input_schema: {
          type: 'object',
          properties: {
            resumeText: {
              type: 'string',
              description: '简历的纯文本内容（已从 PDF/Word 中提取）',
            },
          },
          required: ['resumeText'],
        },
        output_schema: {
          type: 'object',
          properties: {
            basic: { type: 'object', description: '基本信息（姓名、电话、邮箱）' },
            skills: { type: 'array', description: '技能列表' },
            experience: { type: 'array', description: '工作经历' },
            education: { type: 'array', description: '教育经历' },
          },
        },
      },
      status: 'verified',
      invoke_count: 87,
    },
    {
      title: '面试题生成器',
      description: '根据职位和难度自动生成技术面试题，含参考答案和评分标准。适用于前端、后端、算法等岗位。',
      user_id: authorId,
      kind: 'api',
      protocol: {
        type: 'interview-gen',
        roles: ['frontend', 'backend', 'algorithm'],
        input_schema: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              description: '岗位方向，如 frontend、backend、algorithm',
            },
            difficulty: {
              type: 'string',
              description: '难度级别：easy、medium、hard',
            },
            count: {
              type: 'number',
              description: '生成题目数量，默认 5',
            },
          },
          required: ['role'],
        },
        output_schema: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              description: '生成的面试题列表',
            },
          },
        },
      },
      status: 'published',
      invoke_count: 156,
    },
  ]

  const results: string[] = []

  for (const skill of demoSkills) {
    // 检查是否已存在
    const { data: existing } = await supabase.from('skills')
      .select('id')
      .ilike('title', skill.title)
      .limit(1)

    if (existing && existing.length > 0) {
      // 更新
      const { error } = await supabase.from('skills').update({
        description: skill.description,
        protocol: skill.protocol,
        status: skill.status,
        invoke_count: skill.invoke_count,
      }).eq('id', existing[0].id)

      if (error) results.push(`更新 ${skill.title} 失败: ${error.message}`)
      else results.push(`更新 ${skill.title} 成功`)
    } else {
      // 创建
      const { error } = await supabase.from('skills').insert({
        ...skill,
        last_invoked_at: new Date(Date.now() - Math.random() * 3 * 86400000).toISOString(),
      })

      if (error) results.push(`创建 ${skill.title} 失败: ${error.message}`)
      else results.push(`创建 ${skill.title} 成功`)
    }
  }

  res.json({ success: true, data: { results } })
})

export default router
