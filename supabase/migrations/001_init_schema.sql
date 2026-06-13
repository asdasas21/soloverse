-- TalentX 核心数据表（修复版：去掉演示用户 INSERT）

-- ==========================================
-- 1. profiles 表
-- ==========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  title TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 2. trials 表
-- ==========================================
CREATE TYPE trial_difficulty AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE trial_status AS ENUM ('draft', 'active', 'archived');

CREATE TABLE public.trials (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty trial_difficulty NOT NULL DEFAULT 'intermediate',
  status trial_status NOT NULL DEFAULT 'active',
  duration_hours INTEGER NOT NULL DEFAULT 48,
  tags TEXT[] NOT NULL DEFAULT '{}',
  participant_count INTEGER NOT NULL DEFAULT 0,
  system_prompt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 3. trial_sessions 表
-- ==========================================
CREATE TYPE session_status AS ENUM ('in_progress', 'submitted', 'evaluated', 'expired');

CREATE TABLE public.trial_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trial_id TEXT NOT NULL REFERENCES public.trials(id),
  status session_status NOT NULL DEFAULT 'in_progress',
  scores_curiosity INTEGER NOT NULL DEFAULT 50,
  scores_reliability INTEGER NOT NULL DEFAULT 50,
  scores_fact_checking INTEGER NOT NULL DEFAULT 50,
  scores_diverse_thinking INTEGER NOT NULL DEFAULT 50,
  scores_uncertainty_tolerance INTEGER NOT NULL DEFAULT 50,
  scores_low_ego_high_drive INTEGER NOT NULL DEFAULT 50,
  turn_count INTEGER NOT NULL DEFAULT 0,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 4. evaluations 表
-- ==========================================
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.trial_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trial_id TEXT NOT NULL REFERENCES public.trials(id),
  portrait JSONB NOT NULL DEFAULT '{}'::jsonb,
  dimension_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  cert_score NUMERIC(5,1) NOT NULL DEFAULT 0,
  cert_level TEXT,
  summary TEXT,
  turn_evaluations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 5. certificates 表
-- ==========================================
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cert_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  trial_id TEXT NOT NULL REFERENCES public.trials(id),
  level TEXT NOT NULL,
  cert_score NUMERIC(5,1) NOT NULL,
  portrait JSONB NOT NULL DEFAULT '{}'::jsonb,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verification_code TEXT NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 索引
-- ==========================================
CREATE INDEX idx_sessions_user ON public.trial_sessions(user_id);
CREATE INDEX idx_sessions_trial ON public.trial_sessions(trial_id);
CREATE INDEX idx_sessions_user_trial ON public.trial_sessions(user_id, trial_id);
CREATE INDEX idx_evaluations_user ON public.evaluations(user_id);
CREATE INDEX idx_evaluations_session ON public.evaluations(session_id);
CREATE INDEX idx_certificates_user ON public.certificates(user_id);
CREATE INDEX idx_certificates_number ON public.certificates(cert_number);

-- ==========================================
-- RLS 策略
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "trials_select_all" ON public.trials FOR SELECT USING (true);
CREATE POLICY "sessions_select_own" ON public.trial_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert_own" ON public.trial_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update_own" ON public.trial_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "evaluations_select_own" ON public.evaluations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "evaluations_insert_own" ON public.evaluations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "certificates_select_all" ON public.certificates FOR SELECT USING (true);

-- ==========================================
-- 自动创建 profile 的触发器
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 更新时间戳触发器
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trials_updated_at BEFORE UPDATE ON public.trials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- 初始试炼数据
-- ==========================================
INSERT INTO public.trials (id, title, description, difficulty, status, duration_hours, tags, participant_count) VALUES
  ('hackathon-1', 'AI Agent 黑客松', '48小时内完成一个AI Agent项目，从零到可运行的MVP。Agent将实时观察你的编码行为并评估底层能力。', 'intermediate', 'active', 48, ARRAY['黑客松', 'AI', 'Agent'], 128),
  ('rag-system', 'RAG 系统搭建', '构建一个检索增强生成系统，展示你的技术深度和AI工具运用能力。', 'advanced', 'active', 24, ARRAY['黑客松', 'RAG', 'AI'], 67),
  ('code-review', '代码审查挑战', '审查并改进一段生产级代码，展示你的工程素养和问题发现能力。', 'beginner', 'active', 4, ARRAY['代码审查', '工程素养'], 256);
