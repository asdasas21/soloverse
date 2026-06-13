-- 创建演示用户

-- 插入 auth.users（Supabase 实际列结构）
INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  last_sign_in_at,
  instance_id,
  is_sso_user
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'demo@talentx.dev',
  crypt('demo123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"username":"demo-user","display_name":"张三"}',
  now(),
  now(),
  now(),
  '00000000-0000-0000-0000-000000000000',
  false
)
ON CONFLICT (id) DO NOTHING;

-- 插入对应的 profile
INSERT INTO public.profiles (id, username, display_name, title, bio)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'demo-user',
  '张三',
  '全栈工程师',
  '5年开发经验，专注于前端工程化和AI应用开发。热爱技术分享，曾参与多个开源项目。'
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  title = EXCLUDED.title,
  bio = EXCLUDED.bio;

-- 插入演示会话
INSERT INTO public.trial_sessions (
  id,
  user_id,
  trial_id,
  status,
  scores_curiosity,
  scores_reliability,
  scores_fact_checking,
  scores_diverse_thinking,
  scores_uncertainty_tolerance,
  scores_low_ego_high_drive,
  turn_count,
  submitted_at
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'hackathon-1',
  'evaluated',
  78, 85, 72, 88, 65, 82,
  5,
  now() - interval '5 days'
)
ON CONFLICT (id) DO NOTHING;

-- 插入演示评估
INSERT INTO public.evaluations (
  id,
  session_id,
  user_id,
  trial_id,
  portrait,
  dimension_scores,
  cert_score,
  cert_level,
  summary
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'hackathon-1',
  '{"curiosity":78,"reliability":85,"factChecking":72,"diverseThinking":88,"uncertaintyTolerance":65,"lowEgoHighDrive":82}'::jsonb,
  '{"D1_codeQuality":82,"D2_problemSolving":75,"D3_innovation":80,"D4_communication":78,"D5_execution":76}'::jsonb,
  78.3,
  'C2',
  '展现出扎实的技术功底和优秀的系统设计能力，在多元化思维和创新方面表现突出。'
)
ON CONFLICT (id) DO NOTHING;

-- 插入演示证书
INSERT INTO public.certificates (
  cert_number,
  user_id,
  evaluation_id,
  trial_id,
  level,
  cert_score,
  portrait,
  verification_code
) VALUES (
  'TX-2026-C2-00421',
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'hackathon-1',
  'C2',
  78.3,
  '{"curiosity":78,"reliability":85,"factChecking":72,"diverseThinking":88,"uncertaintyTolerance":65,"lowEgoHighDrive":82}'::jsonb,
  'v1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6'
)
ON CONFLICT (cert_number) DO NOTHING;
