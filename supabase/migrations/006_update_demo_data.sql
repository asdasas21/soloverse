-- 更新演示数据的用户 ID 关联（新演示用户）
DO $$
DECLARE
  new_user_id UUID := '7d435cbc-1f0d-4bcd-9d01-0c717ad9754b';
BEGIN
  -- 插入演示会话
  INSERT INTO public.trial_sessions (
    id, user_id, trial_id, status,
    scores_curiosity, scores_reliability, scores_fact_checking,
    scores_diverse_thinking, scores_uncertainty_tolerance, scores_low_ego_high_drive,
    turn_count, submitted_at
  ) VALUES (
    'c0000000-0000-0000-0000-000000000001', new_user_id, 'hackathon-1', 'evaluated',
    78, 85, 72, 88, 65, 82, 5, now() - interval '5 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- 插入演示评估
  INSERT INTO public.evaluations (
    id, session_id, user_id, trial_id,
    portrait, dimension_scores, cert_score, cert_level, summary
  ) VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    new_user_id, 'hackathon-1',
    '{"curiosity":78,"reliability":85,"factChecking":72,"diverseThinking":88,"uncertaintyTolerance":65,"lowEgoHighDrive":82}'::jsonb,
    '{"D1_codeQuality":82,"D2_problemSolving":75,"D3_innovation":80,"D4_communication":78,"D5_execution":76}'::jsonb,
    78.3, 'C2',
    '展现出扎实的技术功底和优秀的系统设计能力，在多元化思维和创新方面表现突出。'
  ) ON CONFLICT (id) DO NOTHING;

  -- 插入演示证书
  INSERT INTO public.certificates (
    cert_number, user_id, evaluation_id, trial_id,
    level, cert_score, portrait, verification_code
  ) VALUES (
    'TX-2026-C2-00421', new_user_id,
    'd0000000-0000-0000-0000-000000000001', 'hackathon-1',
    'C2', 78.3,
    '{"curiosity":78,"reliability":85,"factChecking":72,"diverseThinking":88,"uncertaintyTolerance":65,"lowEgoHighDrive":82}'::jsonb,
    'v1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6'
  ) ON CONFLICT (cert_number) DO NOTHING;
END $$;
