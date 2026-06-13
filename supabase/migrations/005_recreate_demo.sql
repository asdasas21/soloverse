-- 删除旧的演示用户，用 Admin API 重新创建
DELETE FROM auth.users WHERE email = 'demo@talentx.dev';

-- 也删除关联的 profile（会因外键级联删除）
-- 不需要手动删除，CASCADE 会处理
