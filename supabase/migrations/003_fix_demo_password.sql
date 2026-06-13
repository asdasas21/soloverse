-- 重置演示用户密码（使用 Supabase Auth 的加密方式）
UPDATE auth.users
SET encrypted_password = crypt('demo123456', gen_salt('bf'))
WHERE email = 'demo@talentx.dev';
