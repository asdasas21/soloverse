-- 用户角色体系：区分 talent（试炼者）和 enterprise（企业端）
-- 默认为 talent，注册时可通过 metadata 指定

-- 1. 添加 role 字段
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'talent';

-- 2. 创建角色枚举约束（仅允许 talent / enterprise）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check CHECK (role IN ('talent', 'enterprise'));
  END IF;
END $$;

-- 3. 将现有的企业演示账号标记为 enterprise 角色
UPDATE public.profiles
  SET role = 'enterprise'
  WHERE username = 'enterprise_demo' OR display_name = '企业演示账号';

-- 4. 更新 RLS：企业端用户只能查看 candidates/profiles（不能参加试炼）
--    talent 用户只能查看自己的数据（不能访问企业端数据）
-- 现有 RLS 已经足够保护 profiles（用户只能 CRUD 自己的）
-- enterprise API 层面做角色校验即可
