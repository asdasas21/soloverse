-- 修复演示用户
UPDATE auth.users SET
  aud = 'authenticated',
  role = 'authenticated',
  encrypted_password = crypt('demo123456', gen_salt('bf')),
  email_confirmed_at = now(),
  raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"provider":"email","providers":["email"]}',
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"username":"demo-user","display_name":"张三"}',
  updated_at = now()
WHERE email = 'demo@talentx.dev';
