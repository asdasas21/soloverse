# TalentX · 人才试炼场

> 简历可以包装，真实行为不会说谎。

TalentX 是一个 AI 驱动的能力认证平台。用户在 5 种交互式工作区中完成真实工程任务——做决策、写代码、审 diff、画架构、做路演——AI 在后台静默采集行为数据，通过 EMA 算法生成六维能力 DNA 和 C1-C3 级认证。没有聊天，没有口试，只有真实行为。

## 核心特性

### 工作区评估范式

告别传统对话式面试。用户在真实工程场景中操作，AI 静默观察：

| 工作区类型 | 场景示例 | 评估什么 |
|-----------|---------|---------|
| 决策模拟 | 技术选型、危机应对 | 决策质量、风险判断 |
| 代码审查 | 生产级代码找 bug | 事实洁癖、工程素养 |
| 架构设计 | 高并发系统画架构 | 系统思维、技术深度 |
| 编码实战 | 修复安全漏洞 | 代码质量、靠谱程度 |
| 路演构建 | 项目 Pitch 陈述 | 表达力、多元思维 |

### 新手引导系统

首次登录自动展示交互式引导，帮助用户快速了解平台核心价值：

- **个人端引导（5 步）** — 平台介绍 → 五种工作区 → 六维能力 DNA → C1-C3 认证体系 → 任务广场入口
- **企业端引导（6 步）** — 企业端欢迎 → 候选人库筛选 → 六维能力画像 → 证书在线验真 → 发布任务 → MCP 协议接入
- 引导完成后记录到 localStorage，不再重复弹出；可随时通过清除浏览器存储重新触发
- 全程使用 Framer Motion 动画过渡，统一品牌视觉（主色 `#c96442`，背景 `#f5f4ed`）

### Landing 页详细介绍

首页包含完整的平台介绍：

- **工作区类型展示** — 5 种工作区的图标、名称和评估说明
- **六维能力体系** — 好奇心、靠谱、事实洁癖、多元化思维、忍受不确定性、低 ego 高自驱的详细解释
- **完整流程时间线** — 从注册到认证到企业端招聘的全链路可视化

### 对用户（技术人才）

- **7 大试炼场景** — AI Agent 黑客松、RAG 系统搭建、代码审查挑战、高并发系统设计、前端工程化、线上故障排查、RESTful API 设计
- **多阶段评估** — 每个试炼拆分 3-4 个阶段（需求理解→方案设计→编码实现→项目路演）
- **六维能力 DNA** — 好奇心、靠谱、事实洁癖、多元化思维、忍受不确定性、低 ego 高自驱
- **C1-C3 认证** — 可验证的数字证书（含二维码），替代纸面简历
- **Skill Studio** — 创建、发布、调用 AI 能力验证 Skills，支持 MCP 协议接入
- **赛季系统** — 季度排名、能力保鲜度
- **排行榜** — 能力排名 Top 榜，支持按六维维度切换排序

### 对企业（HR / 招聘方）

- **候选人看板** — 按姓名、认证等级、综合分、六维能力分数组合筛选
- **多维搜索** — 选择特定能力维度（如"好奇心"）设最低分阈值，精准匹配岗位需求
- **候选人详情** — 六维雷达图、能力 DNA、历史试炼记录、认证状态
- **证书验证** — 扫描二维码或输入验证码验证证书真伪
- **定制试炼** — 发布企业专属试炼，设定评估重点和难度
- **预制试炼库**  内置 6 个企业招聘场景（技术深度面试、产品思维评估、数据分析实战、团队管理与领导力、沟通协作能力、架构师系统设计），开箱即用
- **MCP 集成** — 通过 JSON-RPC 协议接入 Claude / Cursor 等外部 AI 工具
- **新手引导** — 首次进入企业端自动展示 6 步功能引导

### MCP Server

内置 7 个 MCP Tools，支持外部 AI Agent 调用：

| Tool | 功能 |
|------|------|
| `get_user_profile` | 获取用户能力画像（六维分数、认证等级） |
| `verify_certificate` | 验证证书真伪（支持 `certNumber` 别名） |
| `get_user_skills` | 获取用户已发布的 Skills |
| `invoke_skill` | 调用能力验证 Skill |
| `search_talent` | 按维度/认证等级搜索人才库（支持 `minCertLevel` 别名） |
| `get_coding_behavior` | 获取编码行为统计 |
| `get_leaderboard` | 获取能力排行榜（支持 `dimension` 参数按维度排序） |

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion |
| 后端 | Node.js + Express + TypeScript |
| 数据库 | PostgreSQL (Supabase) + Row Level Security |
| AI | 智谱 GLM-4-Flash（评估引擎 + Skill 执行，SSE 流式输出） |
| 认证 | Supabase Auth (JWT Bearer Token) |
| 协议 | MCP (JSON-RPC 2.0) + SSE |
| 部署 | Vercel |

## 项目结构

```
├── api/                        # 后端 API
│   ├── routes/                 # 路由
│   │   ├── trials.ts           # 试炼管理
│   │   ├── evaluate.ts         # AI 评估引擎（含 per-user 限流）
│   │   ├── chat.ts             # AI 对话（SSE 流式 + 身份验证）
│   │   ├── skills.ts           # Skill CRUD + invoke
│   │   ├── enterprise.ts       # 企业端（候选人/定制试炼）
│   │   ├── cert.ts             # 证书查询/验证
│   │   ├── profile.ts          # 用户画像（含 /me 路由）
│   │   ├── leaderboard.ts      # 排行榜（支持维度排序）
│   │   ├── season.ts           # 赛季系统
│   │   └── demo.ts             # 演示数据种子
│   ├── mcp-server.ts           # MCP JSON-RPC 服务
│   ├── lib/glm.ts              # GLM 调用（含 callGLMStream 流式）
│   └── middleware/auth.ts      # JWT 认证中间件
├── src/                        # 前端
│   ├── pages/                  # 页面
│   │   ├── Landing.tsx         # 首页（含详细平台介绍）
│   │   ├── Auth.tsx            # 登录/注册
│   │   ├── Trials.tsx          # 试炼大厅
│   │   ├── TrialSession.tsx    # 试炼进行（工作区）
│   │   ├── Profile.tsx         # 个人画像
│   │   ├── Certificate.tsx     # 认证证书
│   │   ├── Leaderboard.tsx     # 排行榜（含维度筛选）
│   │   ├── EnterpriseDashboard.tsx  # 企业端仪表盘（含新手引导）
│   │   ├── TaskMarket.tsx      # 任务广场
│   │   ├── Pricing.tsx         # 订阅定价
│   │   └── SkillStudio.tsx     # Skill 工作室
│   ├── components/             # 组件
│   │   ├── Onboarding.tsx      # 新手引导（个人端 + 企业端双模式）
│   │   ├── workspaces/         # 5 种工作区组件
│   │   ├── RadarChart.tsx      # 六维雷达图
│   │   ├── AbilityDNA.tsx      # 能力 DNA
│   │   ├── CountUp.tsx         # 数字动画
│   │   └── ShareCard.tsx       # 分享卡片（含二维码）
│   ├── data/
│   │   ├── trialPhases.ts      # 多阶段试炼配置
│   │   └── scenarioEngine.ts   # 场景引擎（分支逻辑）
│   ├── store/                  # Zustand 状态管理
│   ├── api/                    # API 客户端
│   └── utils/emaEngine.ts      # EMA 评分引擎
├── supabase/
│   └── migrations/             # 数据库迁移（17 个）
└── .env.example                # 环境变量模板
```

## 快速开始

### 环境要求

- Node.js 18+
- npm

### 安装

```bash
git clone https://github.com/asdasas21/soloverse.git
cd soloverse
npm install
```

### 配置环境变量

创建 `.env` 文件：

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI
DEEPSEEK_API_KEY=your_ai_api_key

# API
VITE_API_BASE=http://localhost:3001/api
```

### 启动开发服务器

```bash
# 同时启动前端 + 后端
npm run dev

# 或分别启动
npm run server:dev    # 后端 → localhost:3001
npx vite --port 5173  # 前端 → localhost:5173
```

### 演示账号

| 账号 | 邮箱 | 密码 | 说明 |
|------|------|------|------|
| 高分演示 | demo@talentx.dev | demo123456 | C3 专家级，完整数据 |
| 中分演示 | mid@talentx.dev | mid123456 | C2 专业级 |
| 低分演示 | low@talentx.dev | low123456 | C1 基础级 |
| 企业端 | enterprise@talentx.dev | ent123456 | HR 视角，候选人看板 |

> 也可在登录页点击对应按钮直接登录。

## 评分算法

采用 EMA（指数移动平均）算法对六维能力进行动态评分：

```
EMA_new = α × Score_new + (1 - α) × EMA_old
```

- α = 0.3，近期表现权重更高
- 隐式事件（如代码提交）以 0.15 系数叠加
- 综合分 = 六维均值
- 认证等级：C1 ≥ 60（基础）/ C2 ≥ 75（专业）/ C3 ≥ 88（专家）

## 业务流程

```
用户注册 → 选择试炼 → 进入工作区
                              ↓
                    AI 静默采集行为数据
                    （决策/代码/架构/路演）
                              ↓
                    提交评估 → EMA 六维计算
                              ↓
                    达标 → 颁发 C1-C3 认证证书
                    未达标 → 显示六维短板 + 改进建议
                              ↓
                    企业端搜索 → 维度匹配 → 验证证书
```

## 安全与限流

- **JWT 身份验证** — 所有 API 路由通过 Bearer Token 验证用户身份
- **所有权校验** — 试炼会话、对话等资源校验所属用户，防止越权访问
- **per-user 限流** — 评估提交接口限制每用户每小时 5 次，防止滥用
- **CORS 白名单** — 仅允许配置的域名访问 API
- **Row Level Security** — Supabase 数据库层行级安全策略

## 设计系统

| 元素 | 值 |
|------|---|
| 主色 | `#c96442`（赤陶橙） |
| 背景 | `#f5f4ed`（暖白） |
| 文字 | `#141413`（近黑）/ `#5e5d59`（灰） |
| 边框 | `#e8e6dc`（浅米） |
| 成功 | `#4a8c6f`（森绿） |
| 标题字体 | Playfair Display（衬线） |
| 正文字体 | DM Sans（无衬线） |
| 图标库 | lucide-react |

## License

MIT
