/**
 * 场景引擎 — 工作区评估范式核心
 *
 * 核心理念：不是对话，是做事。
 * AI Agent 是静默观察者和事件生成器，不是聊天对象。
 * 用户在真实工作区中操作，系统采集行为数据。
 */

// ── 工作区类型 ──
export type WorkspaceType =
  | 'decision'     // 决策面板：面对复杂场景做选择
  | 'code-review'  // 代码审查台：审查真实 diff
  | 'design'       // 设计画板：拖拽组件画架构
  | 'code-edit'    // 代码编辑器：实际写代码
  | 'pitch'        // 路演构建器：结构化填空

// ── 场景事件 ──
export interface ScenarioEvent {
  id: string
  /** 事件类型 */
  type: 'briefing' | 'crisis' | 'review-request' | 'deadline' | 'stakeholder'
  /** 标题 */
  title: string
  /** 场景描述 */
  description: string
  /** 关联的工作区 */
  workspace: WorkspaceType
  /** 工作区配置 */
  workspaceConfig: WorkspaceConfig
  /** 此事件重点评估的维度 */
  focusDimensions: string[]
  /** AI 静默观察的评估指令 */
  observerHint: string
}

// ── 工作区配置（联合类型） ──
export type WorkspaceConfig =
  | DecisionConfig
  | CodeReviewConfig
  | DesignConfig
  | CodeEditConfig
  | PitchConfig

// 决策面板配置
export interface DecisionConfig {
  type: 'decision'
  /** 场景背景 */
  scenario: string
  /** 决策选项 */
  options: DecisionOption[]
  /** 选择后触发的后续事件（branching） */
  branches?: Record<string, string>
}

export interface DecisionOption {
  id: string
  label: string
  /** 这个选择的后果描述（选择后显示） */
  consequence: string
  /** 评估权重（AI 用于判断决策质量） */
  weight: number
}

// 代码审查台配置
export interface CodeReviewConfig {
  type: 'code-review'
  /** 代码语言 */
  language: string
  /** 要审查的代码 */
  code: string
  /** 上下文说明 */
  context: string
  /** 已知的真实问题（用户需要发现） */
  knownIssues: CodeIssue[]
}

export interface CodeIssue {
  line: number
  severity: 'critical' | 'warning' | 'style'
  category: string
  description: string
}

// 设计画板配置
export interface DesignConfig {
  type: 'design'
  /** 可用组件 */
  components: DesignComponent[]
  /** 场景约束 */
  constraints: string[]
  /** 画板提示 */
  prompt: string
}

export interface DesignComponent {
  id: string
  name: string
  icon: string
  category: 'compute' | 'storage' | 'network' | 'queue' | 'cache' | 'security'
}

// 代码编辑器配置
export interface CodeEditConfig {
  type: 'code-edit'
  language: string
  /** 起始代码（模板） */
  starterCode: string
  /** 任务要求 */
  requirements: string[]
  /** 测试用例（展示给用户） */
  testCases?: string[]
}

// 路演构建器配置
export interface PitchConfig {
  type: 'pitch'
  /** 路演结构 */
  sections: PitchSection[]
  /** 限时（秒） */
  timeLimit?: number
}

export interface PitchSection {
  id: string
  title: string
  placeholder: string
  minWords: number
  /** 评估标准 */
  criteria: string
}

// ── 各试炼的场景序列 ──
export const TRIAL_SCENARIOS: Record<string, ScenarioEvent[]> = {
  // ── AI Agent 黑客松 ──
  'hackathon-1': [
    {
      id: 'h1-brief',
      type: 'briefing',
      title: '黑客松启动',
      description: '48 小时内构建一个 AI 客服 Agent。你的第一个任务是做技术选型决策。',
      workspace: 'decision',
      focusDimensions: ['diverseThinking', 'factChecking'],
      observerHint: '评估用户的选型是否考虑了团队能力、时间约束和技术成熟度的平衡，而非盲目追新。',
      workspaceConfig: {
        type: 'decision',
        scenario: '你的团队有 3 人：一个全栈、一个前端、一个 ML 工程师。需要 48 小时内交付一个能处理退货、退款、物流查询的 AI 客服。技术选型方向？',
        options: [
          { id: 'langgraph', label: 'LangGraph + GPT-4 + 自建知识库', consequence: '功能最强但 48 小时内可能只完成 60%，且有运维负担', weight: 2 },
          { id: 'dify', label: 'Dify 平台 + 现有 API', consequence: '快速搭建，但定制性受限，复杂退货流程可能卡壳', weight: 4 },
          { id: 'flow', label: 'Function Calling + 简单状态机', consequence: '可控性最好，48 小时内可交付完整 MVP，符合团队技能', weight: 5 },
          { id: 'rag', label: '纯 RAG 方案', consequence: '退货退款是流程性问题，纯 RAG 无法处理状态流转', weight: 1 },
        ],
        branches: { langgraph: 'h1-crisis-1', dify: 'h1-crisis-2', flow: 'h1-design', rag: 'h1-crisis-1' },
      },
    },
    {
      id: 'h1-design',
      type: 'briefing',
      title: '架构设计',
      description: '选型完成。现在设计系统架构——拖拽组件，构建数据流。',
      workspace: 'design',
      focusDimensions: ['diverseThinking', 'uncertaintyTolerance'],
      observerHint: '评估用户是否考虑了降级方案、数据流完整性、以及组件间的依赖关系。',
      workspaceConfig: {
        type: 'design',
        prompt: '设计 AI 客服 Agent 的系统架构。需要覆盖：用户接入、意图识别、业务处理、知识检索、回复生成。',
        constraints: ['必须包含降级方案', '必须处理并发会话', '需要人工转接路径'],
        components: [
          { id: 'gateway', name: 'API Gateway', icon: 'bi-door-open', category: 'network' },
          { id: 'router', name: '意图路由', icon: 'bi-shuffle', category: 'compute' },
          { id: 'agent', name: 'Agent Core', icon: 'bi-cpu', category: 'compute' },
          { id: 'rag', name: 'RAG 引擎', icon: 'bi-search', category: 'compute' },
          { id: 'queue', name: '消息队列', icon: 'bi-list-check', category: 'queue' },
          { id: 'cache', name: 'Redis 缓存', icon: 'bi-lightning', category: 'cache' },
          { id: 'db', name: 'PostgreSQL', icon: 'bi-database', category: 'storage' },
          { id: 'human', name: '人工坐席', icon: 'bi-headset', category: 'compute' },
          { id: 'monitor', name: '监控告警', icon: 'bi-graph-up', category: 'network' },
        ],
      },
    },
    {
      id: 'h1-crisis-1',
      type: 'crisis',
      title: '突发：模型 API 限流',
      description: '比赛第 30 小时，GPT-4 API 突然限流，你的 Agent 开始大量超时。评委 2 小时后来看 Demo。',
      workspace: 'decision',
      focusDimensions: ['uncertaintyTolerance', 'lowEgoHighDrive'],
      observerHint: '评估用户在压力下是否冷静——是慌乱重试还是快速切换降级方案。',
      workspaceConfig: {
        type: 'decision',
        scenario: 'GPT-4 API 限流，Demo 在即。你的选择？',
        options: [
          { id: 'retry', label: '加重试 + 排队', consequence: '用户等待更长，但 Demo 时可能恢复', weight: 1 },
          { id: 'fallback', label: '切 GPT-3.5 + 规则兜底', consequence: '质量下降但保证可用性，Demo 不会挂', weight: 5 },
          { id: 'mock', label: '演示用录制数据', consequence: 'Demo 能过但被发现就完蛋', weight: 1 },
          { id: 'queue-up', label: '排队 + 实时等待提示', consequence: '诚实但体验差，评委看到排队可能扣分', weight: 3 },
        ],
      },
    },
    {
      id: 'h1-pitch',
      type: 'briefing',
      title: '项目路演',
      description: '评委来了。用结构化的方式展示你的项目——不是聊天，是路演。',
      workspace: 'pitch',
      focusDimensions: ['lowEgoHighDrive', 'uncertaintyTolerance'],
      observerHint: '评估路演的逻辑性、数据支撑、风险认知。能否在有限时间内讲清楚核心价值。',
      workspaceConfig: {
        type: 'pitch',
        timeLimit: 300,
        sections: [
          { id: 'problem', title: '问题', placeholder: '你解决的什么问题？目标用户是谁？', minWords: 20, criteria: '问题是否清晰、有数据支撑' },
          { id: 'solution', title: '方案', placeholder: '你的 AI Agent 做了什么？核心技术亮点？', minWords: 30, criteria: '方案是否与技术选型一致' },
          { id: 'demo', title: 'Demo 数据', placeholder: '关键指标：准确率、响应时间、处理量', minWords: 15, criteria: '是否有量化结果' },
          { id: 'risk', title: '风险与不足', placeholder: '你遇到的最大挑战？还有什么没做好？', minWords: 15, criteria: '是否诚实面对不足' },
        ],
      },
    },
  ],

  // ── 代码审查挑战 ──
  'code-review': [
    {
      id: 'cr-context',
      type: 'briefing',
      title: '代码上下文',
      description: '这是一段生产环境的用户认证中间件代码。审查它——不是描述问题，是找到问题。',
      workspace: 'code-review',
      focusDimensions: ['factChecking', 'reliability'],
      observerHint: '评估用户是否系统化地检查了：SQL 注入、时序攻击、JWT 安全、错误处理、并发问题。',
      workspaceConfig: {
        type: 'code-review',
        language: 'TypeScript',
        context: 'Express.js 用户认证中间件，处理登录和 JWT 验证。部署在生产环境，日活 10 万。',
        code: `1  import express from 'express';
2  import jwt from 'jsonwebtoken';
3  import bcrypt from 'bcryptjs';
4  import { db } from './db';
5  
6  const router = express.Router();
7  const SECRET = 'mySecretKey123';
8  
9  router.post('/login', async (req, res) => {
10   const { email, password } = req.body;
11   const user = await db.query(
12     \`SELECT * FROM users WHERE email = '\${email}'\`
13   );
14   if (!user) return res.status(404).json({ error: 'User not found' });
15   const valid = bcrypt.compareSync(password, user.password);
16   if (!valid) return res.status(401).json({ error: 'Wrong password' });
17   const token = jwt.sign({ id: user.id }, SECRET);
18   res.json({ token });
19 });
20 
21 router.get('/profile', async (req, res) => {
22   const token = req.headers.authorization?.replace('Bearer ', '');
23   try {
24     const decoded = jwt.verify(token, SECRET) as any;
25     const user = await db.query(\`SELECT * FROM users WHERE id = \${decoded.id}\`);
26     const profiles = await db.query(\`SELECT * FROM profiles WHERE user_id = \${decoded.id}\`);
27     res.json({ user, profiles });
28   } catch {
29     res.status(401).json({ error: 'Invalid token' });
30   }
31 });`,
        knownIssues: [
          { line: 7, severity: 'critical', category: '安全', description: 'JWT 密钥硬编码在代码中，应使用环境变量' },
          { line: 12, severity: 'critical', category: '安全', description: 'SQL 注入漏洞：直接拼接 email 到查询中' },
          { line: 14, severity: 'warning', category: '安全', description: '用户枚举：通过不同的错误信息可以判断邮箱是否注册' },
          { line: 17, severity: 'warning', category: '安全', description: 'JWT 未设置过期时间，token 永久有效' },
          { line: 25, severity: 'critical', category: '安全', description: 'SQL 注入：decoded.id 直接拼接到查询' },
          { line: 26, severity: 'warning', category: '性能', description: 'N+1 查询：分别查询 user 和 profiles，应使用 JOIN' },
          { line: 28, severity: 'style', category: '健壮性', description: 'catch 块吞掉了所有错误，不利于调试' },
        ],
      },
    },
    {
      id: 'cr-fix',
      type: 'review-request',
      title: '修复最严重的问题',
      description: '你在审查中发现了问题。现在修复最关键的 SQL 注入和安全问题——写实际代码。',
      workspace: 'code-edit',
      focusDimensions: ['reliability', 'factChecking'],
      observerHint: '评估修复是否使用了参数化查询、是否设置了 token 过期时间、是否处理了边缘情况。',
      workspaceConfig: {
        type: 'code-edit',
        language: 'TypeScript',
        starterCode: `import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db';

const router = express.Router();
// TODO: 修复安全问题
const SECRET = 'mySecretKey123';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  // TODO: 修复 SQL 注入
  const user = await db.query(\`SELECT * FROM users WHERE email = '\${email}'\`);
  if (!user) return res.status(404).json({ error: 'User not found' });
  // TODO: 统一错误信息防止用户枚举
  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Wrong password' });
  // TODO: 设置 token 过期时间
  const token = jwt.sign({ id: user.id }, SECRET);
  res.json({ token });
});`,
        requirements: [
          '使用参数化查询替代字符串拼接',
          'JWT 密钥从环境变量读取',
          'Token 设置 24 小时过期',
          '登录失败统一返回 "Invalid credentials"',
        ],
      },
    },
    {
      id: 'cr-defend',
      type: 'stakeholder',
      title: '技术评审会',
      description: '技术负责人对你的修复方案有疑问。这不是对话——是你在决策面板上回应评审意见。',
      workspace: 'decision',
      focusDimensions: ['lowEgoHighDrive', 'uncertaintyTolerance'],
      observerHint: '评估用户面对质疑时是否能坚持正确判断，同时虚心接受合理建议。',
      workspaceConfig: {
        type: 'decision',
        scenario: '技术负责人说："参数化查询太麻烦了，内部系统用字符串拼接加正则过滤就够了。"你的回应？',
        options: [
          { id: 'agree', label: '同意，加正则过滤', consequence: '正则过滤无法防御所有注入变种，安全债', weight: 1 },
          { id: 'insist', label: '坚持参数化查询，展示攻击案例', consequence: '正确的坚持，用事实说服而非情绪', weight: 5 },
          { id: 'compromise', label: '核心接口参数化，次要接口正则', consequence: '务实但留下了安全死角', weight: 3 },
          { id: 'escalate', label: '上报安全团队决策', consequence: '推卸技术决策责任', weight: 2 },
        ],
      },
    },
  ],

  // ── 高并发系统设计 ──
  'system-design': [
    {
      id: 'sd-estimate',
      type: 'briefing',
      title: '容量估算',
      description: '设计百万级日活弹幕系统。第一个决策：你的架构方向。',
      workspace: 'decision',
      focusDimensions: ['curiosity', 'factChecking'],
      observerHint: '评估用户是否先估算 QPS 和数据量再做选型，而非盲目选择技术栈。',
      workspaceConfig: {
        type: 'decision',
        scenario: '百万日活弹幕系统，高峰期 QPS 10 万，弹幕延迟 < 500ms。架构核心选型？',
        options: [
          { id: 'redis', label: 'Redis Pub/Sub + WebSocket', consequence: '低延迟，但消息不持久，回看功能受限', weight: 4 },
          { id: 'kafka', label: 'Kafka + 消费者 + WebSocket', consequence: '持久化 + 可扩展，但延迟可能超 500ms', weight: 3 },
          { id: 'hybrid', label: 'Redis 实时 + Kafka 持久化', consequence: '兼顾延迟和持久化，复杂度适中', weight: 5 },
          { id: 'websocket', label: '纯 WebSocket 广播', consequence: '无法扩展到多服务器，单点瓶颈', weight: 1 },
        ],
        branches: { redis: 'sd-design', kafka: 'sd-design', hybrid: 'sd-design', websocket: 'sd-crisis-1' },
      },
    },
    {
      id: 'sd-design',
      type: 'briefing',
      title: '架构设计',
      description: '用设计画板构建完整的弹幕系统架构。',
      workspace: 'design',
      focusDimensions: ['diverseThinking', 'uncertaintyTolerance'],
      observerHint: '评估架构是否覆盖了接入层、消息分发、存储、监控，以及降级方案。',
      workspaceConfig: {
        type: 'design',
        prompt: '设计弹幕系统的完整架构。需要覆盖：客户端接入、消息收发、历史存储、实时推送、监控。',
        constraints: ['高峰期 QPS 10 万', '延迟 < 500ms', '需要支持弹幕过滤', '需要降级方案'],
        components: [
          { id: 'lb', name: '负载均衡', icon: 'bi-diagram-3', category: 'network' },
          { id: 'ws', name: 'WebSocket 网关', icon: 'bi-broadcast', category: 'network' },
          { id: 'redis', name: 'Redis 集群', icon: 'bi-lightning', category: 'cache' },
          { id: 'mq', name: 'Kafka', icon: 'bi-list-nested', category: 'queue' },
          { id: 'filter', name: '弹幕过滤', icon: 'bi-funnel', category: 'compute' },
          { id: 'db', name: 'MongoDB', icon: 'bi-database', category: 'storage' },
          { id: 'cdn', name: 'CDN', icon: 'bi-globe', category: 'network' },
          { id: 'monitor', name: 'Prometheus', icon: 'bi-graph-up', category: 'network' },
          { id: 'fallback', name: '降级服务', icon: 'bi-shield-exclamation', category: 'security' },
        ],
      },
    },
    {
      id: 'sd-crisis-1',
      type: 'crisis',
      title: '突发：弹幕洪峰',
      description: '直播间突然涌入 50 万人，Redis 内存使用率飙到 95%，弹幕延迟 3 秒。',
      workspace: 'decision',
      focusDimensions: ['uncertaintyTolerance', 'reliability'],
      observerHint: '评估用户的应急决策——是保全部功能还是牺牲非核心功能保可用性。',
      workspaceConfig: {
        type: 'decision',
        scenario: 'Redis 快爆了，弹幕延迟 3 秒，用户开始投诉。你的应急方案？',
        options: [
          { id: 'drop', label: '丢弃 50% 弹幕采样', consequence: '快速降负载，但用户体验下降', weight: 4 },
          { id: 'scale', label: '紧急扩容 Redis 集群', consequence: '根本方案但需要 5-10 分钟生效', weight: 3 },
          { id: 'batch', label: '弹幕批量合并 + 降低频率', consequence: '用户感知不明显，有效降负载', weight: 5 },
          { id: 'off', label: '关闭弹幕功能', consequence: '核心功能没了，用户直接流失', weight: 1 },
        ],
      },
    },
  ],

  // ── 线上故障排查 ──
  'debug-master': [
    {
      id: 'dm-triage',
      type: 'crisis',
      title: '告警：线上故障',
      description: '凌晨 3 点，你被 PagerDuty 叫醒。生产环境 API 错误率从 0.1% 飙到 15%。',
      workspace: 'decision',
      focusDimensions: ['uncertaintyTolerance', 'reliability'],
      observerHint: '评估用户的排查优先级——是先止血还是先查根因。',
      workspaceConfig: {
        type: 'decision',
        scenario: '凌晨 3 点，API 错误率 15%，影响 10 万用户。你第一个动作？',
        options: [
          { id: 'rollback', label: '立即回滚上个版本', consequence: '快速止血，但如果不是发版引起的就白做了', weight: 4 },
          { id: 'logs', label: '先看日志定位根因', consequence: '正确但需要 5-10 分钟，期间用户持续受影响', weight: 2 },
          { id: 'scale', label: '扩容应对流量', consequence: '如果是资源问题有效，如果是代码 bug 无效', weight: 3 },
          { id: 'both', label: '回滚止血 + 同步看日志', consequence: '并行操作，先止血再查因', weight: 5 },
        ],
      },
    },
    {
      id: 'dm-code',
      type: 'review-request',
      title: '根因定位',
      description: '日志指向这段代码。审查它，找到 bug。',
      workspace: 'code-review',
      focusDimensions: ['factChecking', 'reliability'],
      observerHint: '评估用户是否发现了连接池泄漏和错误处理缺失。',
      workspaceConfig: {
        type: 'code-review',
        language: 'TypeScript',
        context: '这是出问题的数据库连接模块。部署后运行了 6 小时开始报错。',
        code: `1  import { Pool } from 'pg';
2  
3  const pool = new Pool({ max: 10 });
4  
5  export async function getUser(id: string) {
6    const client = await pool.connect();
7    const result = await client.query(
8      'SELECT * FROM users WHERE id = $1', [id]
9    );
10   return result.rows[0];
11 }
12 
13 export async function updateUser(id: string, data: any) {
14   const client = await pool.connect();
15   try {
16     await client.query(
17       'UPDATE users SET name = $1 WHERE id = $2',
18       [data.name, id]
19     );
20   } catch (err) {
21     console.error(err);
22   }
23 }`,
        knownIssues: [
          { line: 6, severity: 'critical', category: '资源泄漏', description: 'getUser 中获取的 client 从未释放（缺少 client.release()）' },
          { line: 10, severity: 'critical', category: '资源泄漏', description: 'return 前需要 client.release()，否则连接池耗尽' },
          { line: 14, severity: 'warning', category: '资源管理', description: 'updateUser 有 try 但没有 finally 来释放连接' },
          { line: 20, severity: 'warning', category: '错误处理', description: '吞掉错误后调用者不知道操作失败了' },
        ],
      },
    },
    {
      id: 'dm-fix',
      type: 'review-request',
      title: '修复连接泄漏',
      description: '你找到了 bug。现在写修复代码。',
      workspace: 'code-edit',
      focusDimensions: ['reliability', 'lowEgoHighDrive'],
      observerHint: '评估修复是否使用了 try-finally 保证连接释放，以及是否处理了边缘情况。',
      workspaceConfig: {
        type: 'code-edit',
        language: 'TypeScript',
        starterCode: `import { Pool } from 'pg';

const pool = new Pool({ max: 10 });

export async function getUser(id: string) {
  const client = await pool.connect();
  // TODO: 修复连接泄漏
  const result = await client.query(
    'SELECT * FROM users WHERE id = $1', [id]
  );
  return result.rows[0];
}

export async function updateUser(id: string, data: any) {
  const client = await pool.connect();
  // TODO: 使用 try-finally 保证连接释放
  try {
    await client.query(
      'UPDATE users SET name = $1 WHERE id = $2',
      [data.name, id]
    );
  } catch (err) {
    console.error(err);
  }
}`,
        requirements: [
          'getUser: 在 return 前释放连接',
          'updateUser: 使用 try-finally 保证连接释放',
          'updateUser: 错误应向上传播，不要吞掉',
        ],
      },
    },
  ],

  // ── RAG 系统搭建 ──
  'rag-system': [
    {
      id: 'rag-decision',
      type: 'briefing',
      title: '架构方向',
      description: '为企业知识库搭建 RAG 系统。第一个关键决策。',
      workspace: 'decision',
      focusDimensions: ['diverseThinking', 'factChecking'],
      observerHint: '评估用户是否考虑了数据特性（结构化 vs 非结构化）和检索精度要求。',
      workspaceConfig: {
        type: 'decision',
        scenario: '企业有 10 万份文档（PDF、Word、Confluence），需要搭建智能问答。核心检索策略？',
        options: [
          { id: 'naive', label: '简单向量检索 + LLM 生成', consequence: '实现快，但复杂问题召回率低', weight: 2 },
          { id: 'hybrid', label: '向量 + BM25 混合检索 + Rerank', consequence: '精度高，但延迟和成本增加', weight: 5 },
          { id: 'graph', label: '知识图谱 + 向量检索', consequence: '关系推理强，但构建成本极高', weight: 3 },
          { id: 'sql', label: 'Text-to-SQL + 文档检索', consequence: '适合结构化数据，非结构化文档处理弱', weight: 3 },
        ],
      },
    },
    {
      id: 'rag-design',
      type: 'briefing',
      title: '架构设计',
      description: '用设计画板构建 RAG 系统的完整架构。',
      workspace: 'design',
      focusDimensions: ['diverseThinking', 'uncertaintyTolerance'],
      observerHint: '评估是否覆盖了文档处理流水线、Embedding、检索增强、幻觉控制。',
      workspaceConfig: {
        type: 'design',
        prompt: '设计企业知识库 RAG 系统架构。需要覆盖：文档处理、Embedding、检索、生成、评估。',
        constraints: ['10 万份文档', '检索精度 > 90%', '幻觉率 < 5%', '需要支持增量更新'],
        components: [
          { id: 'loader', name: '文档加载器', icon: 'bi-file-earmark-text', category: 'compute' },
          { id: 'chunker', name: '文档分块', icon: 'bi-scissors', category: 'compute' },
          { id: 'embed', name: 'Embedding', icon: 'bi-hash', category: 'compute' },
          { id: 'vector', name: '向量数据库', icon: 'bi-database', category: 'storage' },
          { id: 'rerank', name: 'Rerank', icon: 'bi-sort-numeric-up', category: 'compute' },
          { id: 'llm', name: 'LLM 生成', icon: 'bi-cpu', category: 'compute' },
          { id: 'guard', name: '幻觉检测', icon: 'bi-shield-check', category: 'security' },
          { id: 'cache', name: '语义缓存', icon: 'bi-lightning', category: 'cache' },
          { id: 'feedback', name: '反馈回路', icon: 'bi-arrow-repeat', category: 'network' },
        ],
      },
    },
  ],

  // ── 前端工程化挑战 ──
  'frontend-eng': [
    {
      id: 'fe-decision',
      type: 'briefing',
      title: '工程化方向',
      description: '一个前端项目完全无工程化。你的改造策略？',
      workspace: 'decision',
      focusDimensions: ['diverseThinking', 'reliability'],
      observerHint: '评估用户是否选择了渐进式改造而非大爆炸式重构。',
      workspaceConfig: {
        type: 'decision',
        scenario: '项目有 200 个页面，无构建工具、无类型检查、jQuery + 原生 JS。团队 5 人。改造策略？',
        options: [
          { id: 'rewrite', label: '全面重写为 React + TypeScript', consequence: '周期 6 个月+，风险极高', weight: 1 },
          { id: 'gradual', label: 'Vite 接入 + 逐步 TS 化 + 组件抽离', consequence: '渐进式，2 个月见效，风险可控', weight: 5 },
          { id: 'wrap', label: '微前端包裹旧系统 + 新功能用 React', consequence: '快速隔离，但有双系统维护成本', weight: 4 },
          { id: 'tooling', label: '只加构建工具和 lint，不改框架', consequence: '改善了流程但没解决代码质量问题', weight: 2 },
        ],
      },
    },
    {
      id: 'fe-code',
      type: 'review-request',
      title: '代码现代化',
      description: '将一段遗留 jQuery 代码重写为 TypeScript + 模块化。',
      workspace: 'code-edit',
      focusDimensions: ['reliability', 'factChecking'],
      observerHint: '评估重写是否保持了原有功能、是否使用了类型系统、是否处理了边缘情况。',
      workspaceConfig: {
        type: 'code-edit',
        language: 'TypeScript',
        starterCode: `// 原始 jQuery 代码：
// $('.form').on('submit', function(e) {
//   e.preventDefault();
//   var data = {};
//   $(this).serializeArray().forEach(function(item) {
//     data[item.name] = item.value;
//   });
//   $.post('/api/save', data, function(res) {
//     if (res.success) alert('保存成功');
//     else alert('保存失败：' + res.error);
//   });
// });

// TODO: 用 TypeScript + Fetch API 重写
interface FormData {
  
}

async function submitForm(): Promise<void> {
  
}`,
        requirements: [
          '定义完整的 FormData 接口',
          '使用 async/await 替代回调',
          '类型安全的错误处理',
          '不使用 alert，返回结构化结果',
        ],
      },
    },
  ],

  // ── RESTful API 设计 ──
  'api-design': [
    {
      id: 'api-decision',
      type: 'briefing',
      title: 'API 设计原则',
      description: '为外卖平台设计订单 API。第一个设计决策。',
      workspace: 'decision',
      focusDimensions: ['diverseThinking', 'factChecking'],
      observerHint: '评估用户是否考虑了幂等性、状态机和版本管理。',
      workspaceConfig: {
        type: 'decision',
        scenario: '外卖订单 API，需要处理：下单、支付、取消、退款、查询。订单状态流转方案？',
        options: [
          { id: 'restful', label: 'RESTful 资源 + 状态作为子资源', consequence: 'POST /orders/{id}/cancel, POST /orders/{id}/refund', weight: 5 },
          { id: 'rpc', label: 'RPC 风格动作端点', consequence: 'POST /cancelOrder, POST /refundOrder', weight: 2 },
          { id: 'patch', label: 'PATCH 更新状态字段', consequence: 'POST /orders + PATCH status=canceled', weight: 3 },
          { id: 'event', label: '事件溯源模式', consequence: '过度设计，外卖场景不需要', weight: 2 },
        ],
      },
    },
    {
      id: 'api-code',
      type: 'review-request',
      title: '实现订单 API',
      description: '实现核心的订单创建 API——处理幂等性和验证。',
      workspace: 'code-edit',
      focusDimensions: ['reliability', 'factChecking'],
      observerHint: '评估是否实现了幂等键、参数校验、事务处理。',
      workspaceConfig: {
        type: 'code-edit',
        language: 'TypeScript',
        starterCode: `interface CreateOrderRequest {
  userId: string;
  items: Array<{ dishId: string; quantity: number }>;
  addressId: string;
  // TODO: 添加幂等键
}

interface CreateOrderResponse {
  orderId: string;
  status: string;
  totalPrice: number;
}

// TODO: 实现幂等创建订单
export async function createOrder(req: CreateOrderRequest): Promise<CreateOrderResponse> {
  // 1. 参数校验
  // 2. 幂等检查
  // 3. 计算价格
  // 4. 创建订单（事务）
  // 5. 返回结果
  throw new Error('Not implemented');
}`,
        requirements: [
          '添加 idempotencyKey 字段到请求接口',
          '实现幂等检查（相同 key 返回已有订单）',
          '参数校验（items 非空、quantity > 0）',
          '使用事务创建订单',
        ],
      },
    },
  ],
}

/** 获取试炼的场景序列 */
export function getTrialScenarios(trialId: string): ScenarioEvent[] {
  return TRIAL_SCENARIOS[trialId] || [
    // 默认场景序列
    {
      id: 'default-decision',
      type: 'briefing',
      title: '技术决策',
      description: '面对一个真实工程场景，做出你的技术决策。',
      workspace: 'decision',
      focusDimensions: ['diverseThinking', 'factChecking'],
      observerHint: '评估决策的合理性和 trade-off 分析。',
      workspaceConfig: {
        type: 'decision',
        scenario: '面对一个复杂的技术问题，选择你的方案。',
        options: [
          { id: 'a', label: '方案 A', consequence: '后果 A', weight: 3 },
          { id: 'b', label: '方案 B', consequence: '后果 B', weight: 4 },
          { id: 'c', label: '方案 C', consequence: '后果 C', weight: 2 },
        ],
      },
    },
    {
      id: 'default-code',
      type: 'review-request',
      title: '代码实现',
      description: '实现你的方案。',
      workspace: 'code-edit',
      focusDimensions: ['reliability', 'factChecking'],
      observerHint: '评估代码质量和正确性。',
      workspaceConfig: {
        type: 'code-edit',
        language: 'TypeScript',
        starterCode: '// 在这里实现你的方案\n',
        requirements: ['实现核心功能', '处理边缘情况'],
      },
    },
    {
      id: 'default-pitch',
      type: 'briefing',
      title: '方案陈述',
      description: '结构化地展示你的方案。',
      workspace: 'pitch',
      focusDimensions: ['lowEgoHighDrive', 'uncertaintyTolerance'],
      observerHint: '评估表达的逻辑性和完整性。',
      workspaceConfig: {
        type: 'pitch',
        sections: [
          { id: 'problem', title: '问题', placeholder: '描述你要解决的问题', minWords: 15, criteria: '清晰度' },
          { id: 'solution', title: '方案', placeholder: '描述你的方案', minWords: 20, criteria: '完整性' },
        ],
      },
    },
  ]
}
