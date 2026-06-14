-- ==========================================
-- 商业化系统：订阅、支付、API计量
-- ==========================================

-- 1. 企业订阅表
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free', -- free | starter | pro | enterprise
  status TEXT NOT NULL DEFAULT 'active', -- active | expired | cancelled
  seats INTEGER NOT NULL DEFAULT 1, -- 查看人数配额
  verifications_per_month INTEGER NOT NULL DEFAULT 10,
  api_calls_per_month INTEGER NOT NULL DEFAULT 100,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- 2. 支付订单表（模拟支付）
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_no TEXT UNIQUE NOT NULL,
  product_type TEXT NOT NULL, -- subscription | report | verification_pack
  product_id TEXT, -- plan ID 或 report ID
  amount INTEGER NOT NULL, -- 金额（分）
  currency TEXT NOT NULL DEFAULT 'CNY',
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | failed | refunded
  pay_method TEXT DEFAULT 'mock', -- mock | wechat | alipay
  paid_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_no ON public.orders(order_no);

-- 3. API 调用计量表（用于计费）
CREATE TABLE IF NOT EXISTS public.api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'POST',
  tokens_used INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_user ON public.api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON public.api_usage(created_at);

-- 4. C端增值报告购买记录
CREATE TABLE IF NOT EXISTS public.report_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evaluation_id UUID REFERENCES public.evaluations(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL, -- career_diagnosis | skill_gap | interview_prep
  order_id UUID REFERENCES public.orders(id),
  content JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_purchases_user ON public.report_purchases(user_id);

-- 5. RLS 策略
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_own" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders_own" ON public.orders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "api_usage_own" ON public.api_usage
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "report_purchases_own" ON public.report_purchases
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
