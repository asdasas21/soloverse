-- 创建原子递增 invoke_count 的 RPC 函数（防止竞态条件）
CREATE OR REPLACE FUNCTION increment_invoke_count(skill_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE skills
  SET invoke_count = COALESCE(invoke_count, 0) + 1,
      last_invoked_at = NOW()
  WHERE id = skill_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
