-- ============================================================
-- Skill 系统 + 实时编码行为评估
-- ============================================================

-- 1. skills 表 — 用户可调用的能力接口（入职携带体）
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  -- skill 类型: 'api' (HTTP 接口), 'protocol' (试炼协议), 'hybrid' (两者兼有)
  kind TEXT NOT NULL DEFAULT 'api' CHECK (kind IN ('api', 'protocol', 'hybrid')),
  -- 协议 JSON: 定义这个 skill 的输入/输出/执行逻辑
  -- 对于 'protocol' 类型，这就是"题目即协议"
  protocol JSONB NOT NULL DEFAULT '{}',
  -- skill 的 HTTP 端点（自动生成）
  endpoint TEXT,
  -- 关联的评估 ID（这个 skill 是通过哪次试炼获得的）
  evaluation_id UUID REFERENCES public.evaluations(id) ON DELETE SET NULL,
  -- 状态: draft / published / verified / revoked
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'verified', 'revoked')),
  -- 调用次数（被企业 Agent 调用）
  invoke_count INTEGER NOT NULL DEFAULT 0,
  -- 最后一次调用时间
  last_invoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_skills_user_id ON public.skills(user_id);
CREATE INDEX idx_skills_status ON public.skills(status);
CREATE INDEX idx_skills_endpoint ON public.skills(endpoint);

-- 2. skill_invocations 表 — 记录 skill 被企业调用的日志
CREATE TABLE IF NOT EXISTS public.skill_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  -- 调用者（企业用户 ID）
  caller_id UUID,
  -- 调用者标识（企业名/Agent 名）
  caller_label TEXT,
  -- 输入参数
  input JSONB DEFAULT '{}',
  -- 输出结果
  output JSONB DEFAULT '{}',
  -- 执行耗时（ms）
  duration_ms INTEGER,
  -- 状态: success / failed
  status TEXT NOT NULL DEFAULT 'success',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_skill_invocations_skill_id ON public.skill_invocations(skill_id);

-- 3. coding_events 表 — 实时编码行为追踪
CREATE TABLE IF NOT EXISTS public.coding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.trial_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 事件类型
  event_type TEXT NOT NULL CHECK (event_type IN (
    'edit',        -- 代码编辑
    'search',      -- 搜索文档/API
    'paste',       -- 粘贴代码
    'delete',      -- 删除代码
    'refactor',    -- 重构操作
    'debug',       -- 调试行为
    'test_run',    -- 运行测试
    'git_commit',  -- git 提交
    'ai_assist',   -- AI 辅助请求
    'idle'         -- 停滞/发呆
  )),
  -- 事件详情
  payload JSONB DEFAULT '{}',
  -- 代码统计（字符数变化、行数等）
  chars_added INTEGER DEFAULT 0,
  chars_deleted INTEGER DEFAULT 0,
  -- 时间戳
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coding_events_session ON public.coding_events(session_id);
CREATE INDEX idx_coding_events_user ON public.coding_events(user_id);
CREATE INDEX idx_coding_events_type ON public.coding_events(event_type);

-- 4. 为 coding_events 创建 RLS 策略
ALTER TABLE public.coding_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看自己的编码事件" ON public.coding_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建自己的编码事件" ON public.coding_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. skills 表 RLS
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以管理自己的 skills" ON public.skills
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "任何人可以查看已发布的 skills" ON public.skills
  FOR SELECT USING (status IN ('published', 'verified'));

-- 6. 插入一些 demo skill 数据
INSERT INTO public.skills (user_id, title, description, kind, protocol, status, endpoint)
SELECT
  '7d435cbc-1f0d-4bcd-9d01-0c717ad9754b',
  '代码审查能力验证',
  '验证代码审查能力的可调用接口。输入一段代码，输出审查报告（bug 发现、改进建议、安全风险）。',
  'hybrid',
  '{
    "input_schema": {
      "type": "object",
      "properties": {
        "code": { "type": "string", "description": "待审查的代码" },
        "language": { "type": "string", "description": "编程语言" }
      },
      "required": ["code"]
    },
    "output_schema": {
      "type": "object",
      "properties": {
        "bugs": { "type": "array", "items": { "type": "string" } },
        "improvements": { "type": "array", "items": { "type": "string" } },
        "security_risks": { "type": "array", "items": { "type": "string" } },
        "score": { "type": "number" }
      }
    },
    "evaluation_dimensions": ["factChecking", "reliability", "diverseThinking"]
  }'::jsonb,
  'published',
  '/api/skills/demo/code-review'
ON CONFLICT DO NOTHING;
