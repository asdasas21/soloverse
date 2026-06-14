# TalentX · 人才试炼场

> 简历可以包装，对话不能伪装。

TalentX 是一个 AI 驱动的能力认证平台。用户通过与 AI 导师进行深度技术对话，在真实工程场景中展示技术决策能力，获得基于 EMA 算法的动态能力评分和 C1-C3 级认证。

## 核心特性

### 对用户（技术人才）
- **AI 试炼** — 6 大工程场景（高并发设计、代码审查、RAG 搭建等），AI 导师以面试官身份深度追问
- **六维能力画像** — 好奇心、靠谱、事实洁癖、多元化思维、忍受不确定性、低 ego 高自驱
- **能力 DNA** — 18 位编码表示你的能力指纹，独一无二
- **C1-C3 认证** — 可验证的数字证书，替代纸面简历
- **赛季系统** — 季度排名、能力保鲜度、社区盲评

### 对企业（HR / 招聘方）
- **候选人看板** — 按能力维度筛选、对比候选人
- **证书验证** — 通过验证码或链接验证证书真伪
- **能力 DNA 匹配** — 将岗位需求与候选人能力 DNA 对标

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion |
| 后端 | Node.js + Express + TypeScript |
| 数据库 | PostgreSQL (Supabase) + Row Level Security |
| AI | OpenAI / DeepSeek (SSE 流式对话) |
| 认证 | Supabase Auth (JWT) |
| 部署 | Vercel |

## 项目结构

```
├── api/                    # 后端 API
│   ├── routes/             # 路由（试炼、评估、认证、企业端等）
│   ├── middleware/         # JWT 认证中间件
│   ├── lib/                # Supabase 客户端
│   └── mcp-server.ts       # MCP 协议服务
├── src/                    # 前端
│   ├── pages/              # 页面（Landing, Profile, TrialSession 等）
│   ├── components/         # 组件（RadarChart, AbilityDNA, SkillTree 等）
│   ├── store/              # Zustand 状态管理
│   ├── api/                # API 客户端
│   └── utils/              # EMA 评分引擎
├── supabase/
│   └── migrations/         # 数据库迁移
└── skills/                 # MCP Skill 定义
```

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 pnpm

### 安装

```bash
git clone https://github.com/asdasas21/soloverse.git
cd soloverse
npm install
```

### 配置环境变量

创建 `.env` 文件：

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
DEEPSEEK_API_KEY=your_ai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 启动开发服务器

```bash
# 启动前端（端口 5173）
npm run dev

# 启动后端（端口 3001）
npx tsx api/server.ts
```

### 演示账号

| 账号 | 邮箱 | 密码 | 说明 |
|------|------|------|------|
| 高分演示 | demo@talentx.dev | demo123456 | C3 专家级，完整数据 |
| 中分演示 | mid@talentx.dev | mid123456 | C2 专业级 |
| 低分演示 | low@talentx.dev | low123456 | C1 基础级 |
| 企业端 | enterprise@talentx.dev | ent123456 | HR 视角 |

## 评分算法

采用 EMA（指数移动平均）算法对六维能力进行动态评分：

```
EMA_new = α × Score_new + (1 - α) × EMA_old
```

- α = 0.3，近期表现权重更高
- 综合分 = 六维加权平均
- C1 ≥ 60 / C2 ≥ 75 / C3 ≥ 88

## License

MIT
