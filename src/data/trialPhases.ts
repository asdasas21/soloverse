/**
 * 试炼阶段模型 — 多阶段行为评估
 *
 * 核心理念：真实能力不只体现在对话中。
 * 黑客松有方案设计、编码实现、评审答辩、路演展示等环节；
 * 代码审查有上下文理解、问题发现、修复方案等环节。
 * 每个环节采集不同类型的行为数据，综合评估六维能力。
 */

export type PhaseType = 'dialogue' | 'submission' | 'code' | 'review' | 'presentation'

export interface TrialPhase {
  /** 阶段 ID */
  id: string
  /** 阶段名称 */
  title: string
  /** 阶段类型 */
  type: PhaseType
  /** 阶段描述（给用户看的引导） */
  prompt: string
  /** AI 导师在此阶段的行为指令 */
  systemPromptAddon: string
  /** 此阶段重点评估的维度 */
  focusDimensions: string[]
  /** 最低交互轮数/提交要求 */
  minInteractions: number
}

/** 各试炼的阶段配置 */
export const TRIAL_PHASES: Record<string, TrialPhase[]> = {
  // ── AI Agent 黑客松 ──
  'hackathon-1': [
    {
      id: 'understand',
      title: '需求理解',
      type: 'dialogue',
      prompt: 'AI 导师将发布黑熊松任务背景。你需要主动提问，澄清模糊需求，理解评审标准。',
      systemPromptAddon: '你是黑客松主持人。发布任务背景后，等待用户提问。评估其提问的深度和覆盖面——是否关注边界条件、技术约束、成功标准。',
      focusDimensions: ['curiosity', 'factChecking'],
      minInteractions: 2,
    },
    {
      id: 'design',
      title: '方案设计',
      type: 'submission',
      prompt: '提交你的技术方案：架构图描述、技术选型理由、模块划分。这不是聊天——你需要输出一个结构化的设计文档。',
      systemPromptAddon: '用户将提交技术方案。评审其架构合理性、技术选型的 trade-off 思考、是否考虑了扩展性和边界情况。不要替用户设计，只做评审反馈。',
      focusDimensions: ['diverseThinking', 'uncertaintyTolerance'],
      minInteractions: 1,
    },
    {
      id: 'implement',
      title: '编码实现',
      type: 'code',
      prompt: '提交核心模块的代码实现。AI 导师将审查代码质量、错误处理、边界条件覆盖。',
      systemPromptAddon: '用户将提交代码片段。逐行审查代码质量：命名规范、错误处理、边界条件、可读性。指出具体问题并要求修复。',
      focusDimensions: ['reliability', 'factChecking'],
      minInteractions: 1,
    },
    {
      id: 'pitch',
      title: '项目路演',
      type: 'presentation',
      prompt: '准备一段 3 分钟的项目路演词：讲清楚你做了什么、为什么这么做、效果如何。AI 导师将以评委身份提问。',
      systemPromptAddon: '用户将做路演展示。评估其表达能力、逻辑清晰度、能否在压力下保持冷静、是否虚心接受评委质疑。',
      focusDimensions: ['lowEgoHighDrive', 'uncertaintyTolerance'],
      minInteractions: 2,
    },
  ],

  // ── RAG 系统搭建 ──
  'rag-system': [
    {
      id: 'analyze',
      title: '需求分析',
      type: 'dialogue',
      prompt: 'AI 导师将给出 RAG 系统的业务场景。你需要分析需求，提出技术方案的关键问题。',
      systemPromptAddon: '描述一个需要 RAG 的业务场景（如企业知识库客服）。评估用户是否追问数据规模、检索精度要求、延迟约束等关键问题。',
      focusDimensions: ['curiosity', 'factChecking'],
      minInteractions: 2,
    },
    {
      id: 'architect',
      title: '架构设计',
      type: 'submission',
      prompt: '设计完整的 RAG 架构方案：数据预处理、embedding 策略、向量数据库选型、检索增强方案。',
      systemPromptAddon: '用户提交架构方案。评估其是否考虑了 chunk 策略、rerank、多路召回、幻觉控制等关键设计点。',
      focusDimensions: ['diverseThinking', 'uncertaintyTolerance'],
      minInteractions: 1,
    },
    {
      id: 'optimize',
      title: '问题诊断',
      type: 'dialogue',
      prompt: 'AI 导师给出一个线上 RAG 系统的性能问题（检索准确率低、延迟高）。你需要诊断根因并提出优化方案。',
      systemPromptAddon: '给出一个具体的 RAG 性能问题场景。评估用户的系统化排查思路——是否从数据质量、embedding、检索策略、prompt 工程等多维度分析。',
      focusDimensions: ['reliability', 'diverseThinking'],
      minInteractions: 2,
    },
  ],

  // ── 代码审查挑战 ──
  'code-review': [
    {
      id: 'context',
      title: '上下文理解',
      type: 'dialogue',
      prompt: 'AI 导师将给出一段有问题的代码及其业务背景。你需要先理解上下文，再提出审查思路。',
      systemPromptAddon: '给用户一段有 bug 或设计缺陷的代码（约 30 行），附上业务背景。等待用户提问，评估其是否关注代码意图、调用关系、测试覆盖等。',
      focusDimensions: ['curiosity', 'factChecking'],
      minInteractions: 1,
    },
    {
      id: 'review',
      title: '问题发现',
      type: 'review',
      prompt: '逐行审查代码，列出所有问题：bug、安全漏洞、性能问题、代码坏味道。每条问题需说明原因和修复建议。',
      systemPromptAddon: '用户将提交代码审查报告。评估其发现问题的全面性、严重性判断、修复建议的可行性。追问遗漏的问题。',
      focusDimensions: ['reliability', 'factChecking'],
      minInteractions: 1,
    },
    {
      id: 'defend',
      title: '评审答辩',
      type: 'dialogue',
      prompt: 'AI 导师会对你的审查结论提出质疑。你需要用证据和逻辑捍卫或修正你的判断。',
      systemPromptAddon: '对用户的审查结论提出质疑（有些是正确的质疑，有些是故意误导）。评估用户能否坚持正确判断、是否虚心接受合理反驳。',
      focusDimensions: ['lowEgoHighDrive', 'uncertaintyTolerance'],
      minInteractions: 2,
    },
  ],

  // ── 高并发系统设计 ──
  'system-design': [
    {
      id: 'clarify',
      title: '需求澄清',
      type: 'dialogue',
      prompt: 'AI 导师给出系统设计题目（如"设计一个秒杀系统"）。你需要澄清 QPS、数据量、一致性要求等关键约束。',
      systemPromptAddon: '给出系统设计题目。评估用户是否主动估算 QPS、存储量、带宽等关键参数，是否追问 SLA 要求。',
      focusDimensions: ['curiosity', 'factChecking'],
      minInteractions: 2,
    },
    {
      id: 'design',
      title: '架构设计',
      type: 'submission',
      prompt: '提交完整的架构设计：系统组件图、数据流、容灾方案、容量规划。需要考虑 trade-off。',
      systemPromptAddon: '用户提交架构设计。评估其是否覆盖了负载均衡、缓存策略、数据库分片、消息队列、限流降灾等关键组件，以及 trade-off 分析的深度。',
      focusDimensions: ['diverseThinking', 'uncertaintyTolerance'],
      minInteractions: 1,
    },
    {
      id: 'deep-dive',
      title: '深度追问',
      type: 'dialogue',
      prompt: 'AI 导师将针对你的架构设计中的薄弱环节进行深度追问。你需要现场调整方案。',
      systemPromptAddon: '针对用户方案中的薄弱点（如单点故障、缓存一致性、数据迁移）进行深度追问。评估其应对突发问题的冷静度和调整能力。',
      focusDimensions: ['lowEgoHighDrive', 'reliability'],
      minInteractions: 2,
    },
  ],

  // ── 前端工程化挑战 ──
  'frontend-eng': [
    {
      id: 'analyze',
      title: '现状分析',
      type: 'dialogue',
      prompt: 'AI 导师描述一个前端工程化落后的项目现状。你需要诊断问题并制定改进优先级。',
      systemPromptAddon: '描述一个前端项目的问题（无构建工具、组件散乱、无类型检查、样式混乱）。评估用户的诊断思路和改进优先级排序能力。',
      focusDimensions: ['curiosity', 'reliability'],
      minInteractions: 2,
    },
    {
      id: 'solution',
      title: '方案输出',
      type: 'submission',
      prompt: '输出工程化改造方案：构建工具选型、目录结构规范、CI/CD 流程、代码质量保障体系。',
      systemPromptAddon: '用户提交改造方案。评估方案的系统性、可落地性、是否考虑了渐进式迁移和团队接受度。',
      focusDimensions: ['diverseThinking', 'reliability'],
      minInteractions: 1,
    },
    {
      id: 'review',
      title: '方案评审',
      type: 'dialogue',
      prompt: 'AI 导师以技术委员会身份质疑你的方案。你需要答辩并接受合理的修改建议。',
      systemPromptAddon: '从成本、风险、团队等角度质疑用户的方案。评估其是否固执己见或过度妥协。',
      focusDimensions: ['lowEgoHighDrive', 'uncertaintyTolerance'],
      minInteractions: 2,
    },
  ],

  // ── 线上故障排查 ──
  'debug-master': [
    {
      id: 'triage',
      title: '故障分级',
      type: 'dialogue',
      prompt: 'AI 导师模拟一个线上告警场景。你需要快速判断故障级别，制定排查优先级。',
      systemPromptAddon: '模拟线上告警（如"用户反馈下单失败率升高"）。评估用户是否追问影响范围、持续时间、是否第一次出现等关键信息。',
      focusDimensions: ['uncertaintyTolerance', 'reliability'],
      minInteractions: 2,
    },
    {
      id: 'investigate',
      title: '根因分析',
      type: 'code',
      prompt: 'AI 导师将提供相关日志和代码片段。你需要定位根因，提交修复方案。',
      systemPromptAddon: '提供含线索的日志和代码。评估用户的排查方法是否系统化（监控→日志→链路追踪→代码），修复方案是否考虑了副作用。',
      focusDimensions: ['factChecking', 'reliability'],
      minInteractions: 1,
    },
    {
      id: 'postmortem',
      title: '复盘总结',
      type: 'submission',
      prompt: '提交故障复盘报告：时间线、根因、改进措施、预防方案。',
      systemPromptAddon: '用户提交复盘报告。评估其是否做到了 blameless（不甩锅）、根因分析是否到位、改进措施是否可落地。',
      focusDimensions: ['lowEgoHighDrive', 'diverseThinking'],
      minInteractions: 1,
    },
  ],

  // ── RESTful API 设计 ──
  'api-design': [
    {
      id: 'model',
      title: '领域建模',
      type: 'dialogue',
      prompt: 'AI 导师给出业务场景。你需要从领域驱动设计角度，识别核心实体和关系。',
      systemPromptAddon: '给出一个业务场景（如"设计一个外卖订单系统 API"）。评估用户是否关注业务模型而非直接跳到 URL 设计。',
      focusDimensions: ['curiosity', 'diverseThinking'],
      minInteractions: 2,
    },
    {
      id: 'design',
      title: 'API 设计',
      type: 'submission',
      prompt: '输出完整的 API 设计文档：资源定义、URL 规范、请求/响应格式、状态码、分页/过滤策略。',
      systemPromptAddon: '用户提交 API 设计。评估 RESTful 规范性、版本管理、错误处理、幂等性设计、安全性（认证/授权/限流）。',
      focusDimensions: ['reliability', 'factChecking'],
      minInteractions: 1,
    },
    {
      id: 'iterate',
      title: '需求变更',
      type: 'dialogue',
      prompt: 'AI 导师将提出需求变更（新增字段、批量操作、WebSocket 推送等）。你需要现场调整 API 设计。',
      systemPromptAddon: '提出 2-3 个需求变更场景。评估用户应对变更的灵活性、向后兼容意识、API 版本策略。',
      focusDimensions: ['uncertaintyTolerance', 'lowEgoHighDrive'],
      minInteractions: 2,
    },
  ],
}

/** 阶段类型的中文名称和图标 */
export const PHASE_TYPE_META: Record<PhaseType, { label: string; icon: string; color: string }> = {
  dialogue: { label: '深度对话', icon: 'bi-chat-dots', color: '#c96442' },
  submission: { label: '方案提交', icon: 'bi-file-earmark-text', color: '#d97757' },
  code: { label: '代码实现', icon: 'bi-code-slash', color: '#4a8c6f' },
  review: { label: '审查评审', icon: 'bi-clipboard-check', color: '#8b6fc0' },
  presentation: { label: '路演展示', icon: 'bi-megaphone', color: '#e8a87c' },
}

/** 获取指定试炼的阶段配置，若无配置则返回默认的多阶段 */
export function getTrialPhases(trialId: string): TrialPhase[] {
  if (TRIAL_PHASES[trialId]) {
    return TRIAL_PHASES[trialId]
  }
  // 默认三阶段
  return [
    {
      id: 'dialogue',
      title: '深度对话',
      type: 'dialogue',
      prompt: 'AI 导师将围绕主题与你深度对话，评估你的技术理解力和决策能力。',
      systemPromptAddon: '',
      focusDimensions: ['curiosity', 'diverseThinking'],
      minInteractions: 3,
    },
    {
      id: 'challenge',
      title: '实战挑战',
      type: 'submission',
      prompt: 'AI 导师将给出一个实战问题。你需要提交结构化的解决方案。',
      systemPromptAddon: '给出一个开放性技术问题，要求用户提交结构化方案。',
      focusDimensions: ['reliability', 'uncertaintyTolerance'],
      minInteractions: 1,
    },
    {
      id: 'review',
      title: '答辩复盘',
      type: 'dialogue',
      prompt: 'AI 导师将对你的方案进行质疑和追问。你需要答辩或接受合理建议。',
      systemPromptAddon: '对用户方案提出质疑和追问。',
      focusDimensions: ['lowEgoHighDrive', 'factChecking'],
      minInteractions: 2,
    },
  ]
}
