-- 为 evaluations 表增加 AI 评审报告字段
ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS report JSONB DEFAULT NULL;

COMMENT ON COLUMN public.evaluations.report IS 'AI 定性评审报告（strengths/improvements/evidence）';
