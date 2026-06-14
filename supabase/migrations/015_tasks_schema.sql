-- ==========================================
-- 任务协作系统：发布、申请、提交、评价
-- ==========================================

-- 1. 任务表（Founder 发布）
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  -- 时间节点
  apply_start_at TIMESTAMPTZ,
  apply_deadline TIMESTAMPTZ,
  submit_deadline TIMESTAMPTZ,
  -- 配额与奖励
  max_builders INTEGER NOT NULL DEFAULT 3,
  reward_total INTEGER NOT NULL DEFAULT 0,       -- 总奖励（分）
  deposit_ratio INTEGER NOT NULL DEFAULT 30,     -- 定金比例（%）
  -- 状态
  status TEXT NOT NULL DEFAULT 'open',           -- open | in_review | in_progress | completed | cancelled
  category TEXT DEFAULT 'general',
  -- 关联技能要求（可选）
  required_cert_level TEXT,                       -- C1 | C2 | C3 | null（不限）
  -- 元数据
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_creator ON public.tasks(creator_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON public.tasks(category);

-- 2. 任务申请表（Builder 申请）
CREATE TABLE IF NOT EXISTS public.task_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  builder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',        -- pending | approved | rejected
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, builder_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_task ON public.task_applications(task_id);
CREATE INDEX IF NOT EXISTS idx_applications_builder ON public.task_applications(builder_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.task_applications(status);

-- 3. 任务提交表（Builder 交付）
CREATE TABLE IF NOT EXISTS public.task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  builder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,                          -- 交付内容（文本/链接/描述）
  attachments JSONB DEFAULT '[]'::jsonb,          -- 附件元数据
  status TEXT NOT NULL DEFAULT 'submitted',       -- submitted | approved | rejected | revision_requested
  feedback TEXT,                                  -- Founder 反馈
  reward_amount INTEGER,                          -- 实际奖励（分）
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submissions_task ON public.task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_submissions_builder ON public.task_submissions(builder_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.task_submissions(status);

-- 4. 任务评价表（Founder 对 Builder 的评价）
CREATE TABLE IF NOT EXISTS public.task_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  builder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- 评价维度（1-5 星）
  professionalism INTEGER NOT NULL,               -- 专业度
  communication INTEGER NOT NULL,                 -- 沟通
  quality INTEGER NOT NULL,                       -- 交付质量
  timeliness INTEGER NOT NULL,                    -- 时效性
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, builder_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_builder ON public.task_reviews(builder_id);

-- 5. 组织关注表（Builder 关注组织）
CREATE TABLE IF NOT EXISTS public.org_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, follower_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_org ON public.org_follows(org_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.org_follows(follower_id);

-- 6. RLS 策略
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_follows ENABLE ROW LEVEL SECURITY;

-- 任务：所有人可读（open 的），创建者可写
CREATE POLICY "tasks_read_all" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "tasks_write_own" ON public.tasks FOR ALL USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

-- 申请：Builder 可读写自己的，任务创建者可读
CREATE POLICY "applications_read" ON public.task_applications FOR SELECT USING (
  auth.uid() = builder_id OR auth.uid() IN (
    SELECT creator_id FROM public.tasks WHERE id = task_id
  )
);
CREATE POLICY "applications_write_own" ON public.task_applications FOR ALL 
  USING (auth.uid() = builder_id) WITH CHECK (auth.uid() = builder_id);

-- 提交：Builder 可写自己的，任务创建者可读
CREATE POLICY "submissions_read" ON public.task_submissions FOR SELECT USING (
  auth.uid() = builder_id OR auth.uid() IN (
    SELECT creator_id FROM public.tasks WHERE id = task_id
  )
);
CREATE POLICY "submissions_write_own" ON public.task_submissions FOR ALL 
  USING (auth.uid() = builder_id) WITH CHECK (auth.uid() = builder_id);

-- 评价：所有人可读，reviewer 可写
CREATE POLICY "reviews_read_all" ON public.task_reviews FOR SELECT USING (true);
CREATE POLICY "reviews_write_own" ON public.task_reviews FOR INSERT 
  WITH CHECK (auth.uid() = reviewer_id);

-- 关注：用户可读写自己的
CREATE POLICY "follows_read" ON public.org_follows FOR SELECT USING (
  auth.uid() = follower_id OR auth.uid() = org_id
);
CREATE POLICY "follows_write_own" ON public.org_follows FOR ALL
  USING (auth.uid() = follower_id) WITH CHECK (auth.uid() = follower_id);
