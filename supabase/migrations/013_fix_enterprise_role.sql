-- 修复企业演示账号角色：实际的 username/display_name 是"企业端管理员"
UPDATE public.profiles
  SET role = 'enterprise'
  WHERE username = '企业端管理员'
     OR display_name = '企业端管理员'
     OR username = 'enterprise_demo'
     OR display_name = '企业演示账号';
