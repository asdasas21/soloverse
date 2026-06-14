import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPlans, createOrder, payOrder, getSubscription } from '@/api/client'
import type { Plan, ReportProduct, SubscriptionStatus } from '@/api/client'
import { useToast } from '@/components/Toast'
import { Skeleton } from '@/components/Skeleton'
import { useAuthStore } from '@/store/authStore'

export default function Pricing() {
  const navigate = useNavigate()
  const { show } = useToast()
  const { user, isEnterprise } = useAuthStore()
  const [plans, setPlans] = useState<Plan[]>([])
  const [reports, setReports] = useState<ReportProduct[]>([])
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState<string | null>(null) // track which plan is paying

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const data = await getPlans()
      setPlans(data.plans)
      setReports(data.reports)
      if (user) {
        const sub = await getSubscription()
        setSubscription(sub)
      }
    } catch {
      show('加载失败，请刷新重试', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubscribe(planId: string) {
    if (!user) {
      navigate('/auth')
      return
    }
    if (planId === 'free') return

    setPaying(planId)
    try {
      // 1. 创建订单
      const order = await createOrder('subscription', planId)
      // 2. 模拟支付
      const result = await payOrder(order.id)
      if (result.paid) {
        show(`${result.planName || '订阅'}成功！`, 'success')
        // 刷新订阅状态
        const sub = await getSubscription()
        setSubscription(sub)
      }
    } catch (e) {
      show(e instanceof Error ? e.message : '支付失败', 'error')
    } finally {
      setPaying(null)
    }
  }

  async function handleBuyReport(reportId: string) {
    if (!user) {
      navigate('/auth')
      return
    }

    setPaying(reportId)
    try {
      const order = await createOrder('report', reportId)
      const result = await payOrder(order.id)
      if (result.paid) {
        show('购买成功！正在生成报告...', 'success')
        // 导航到报告生成页
        setTimeout(() => navigate(`/profile/${user.id}`), 1500)
      }
    } catch (e) {
      show(e instanceof Error ? e.message : '支付失败', 'error')
    } finally {
      setPaying(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6" style={{ background: '#f5f4ed' }}>
        <div className="max-w-5xl mx-auto pt-12">
          <Skeleton width="60%" height={40} className="mb-4" />
          <Skeleton width="40%" height={20} className="mb-12" />
          <div className="grid md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} height={200} />)}
          </div>
        </div>
      </div>
    )
  }

  const currentPlan = subscription?.subscription?.plan

  return (
    <div className="min-h-screen pb-16" style={{ background: '#f5f4ed' }}>
      <div className="max-w-5xl mx-auto px-6 pt-12">
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-[#87867f] hover:text-[#5e5d59] mb-4"
          >
            ← 返回
          </button>
          <h1 className="text-3xl font-bold text-[#2d2d28] mb-2">
            {isEnterprise ? '企业订阅方案' : '增值服务'}
          </h1>
          <p className="text-[#87867f]">
            {isEnterprise
              ? '按需选择查看人数和验证次数，灵活扩展团队招聘能力'
              : '深度职业诊断、技能差距分析、面试准备指南'}
          </p>
          {currentPlan && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#4a8c6f]/10 text-[#4a8c6f] text-sm font-medium">
              当前方案：{plans.find(p => p.id === currentPlan)?.name || currentPlan}
              {subscription?.subscription.expiresAt && ` · 到期 ${subscription.subscription.expiresAt}`}
            </div>
          )}
        </div>

        {/* Enterprise: Subscription Plans */}
        {isEnterprise && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-[#2d2d28] mb-4">订阅方案</h2>
            <div className="grid md:grid-cols-4 gap-4">
              {plans.map(plan => {
                const isCurrent = currentPlan === plan.id
                const isPaying = paying === plan.id
                return (
                  <div
                    key={plan.id}
                    className={`p-5 rounded-xl border bg-white transition-shadow hover:shadow-md ${
                      isCurrent ? 'border-[#4a8c6f] ring-2 ring-[#4a8c6f]/20' : 'border-[#e0dfd7]'
                    }`}
                  >
                    <h3 className="font-semibold text-[#2d2d28]">{plan.name}</h3>
                    <div className="mt-2 mb-3">
                      <span className="text-2xl font-bold text-[#2d2d28]">¥{plan.priceYuan}</span>
                      <span className="text-sm text-[#87867f]">/月</span>
                    </div>
                    <ul className="space-y-1.5 mb-4">
                      {plan.features.map((f, i) => (
                        <li key={i} className="text-sm text-[#5e5d59] flex items-start gap-1.5">
                          <span className="text-[#4a8c6f] mt-0.5">·</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="text-xs text-[#87867f] mb-3 space-y-0.5">
                      <div>查看人数：{plan.seats}</div>
                      <div>验证次数：{plan.verifications}/月</div>
                      <div>API 调用：{plan.apiCalls}/月</div>
                    </div>
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={isCurrent || isPaying || plan.id === 'free'}
                      className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                        isCurrent
                          ? 'bg-[#e0dfd7] text-[#87867f] cursor-default'
                          : plan.id === 'free'
                          ? 'bg-[#e0dfd7] text-[#87867f] cursor-default'
                          : isPaying
                          ? 'bg-[#87867f] text-white animate-pulse'
                          : 'bg-[#2d2d28] text-[#f5f4ed] hover:bg-[#3d3d38]'
                      }`}
                    >
                      {isCurrent ? '当前方案' : isPaying ? '支付中...' : plan.id === 'free' ? '免费' : '订阅'}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Usage Stats */}
            {subscription && (
              <div className="mt-6 p-4 rounded-xl bg-white border border-[#e0dfd7]">
                <h3 className="text-sm font-semibold text-[#2d2d28] mb-3">本月用量</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#87867f]">API 调用</span>
                      <span className="font-medium text-[#2d2d28]">
                        {subscription.usage.used} / {subscription.usage.limit}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 bg-[#e0dfd7] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#4a8c6f] rounded-full transition-all"
                        style={{ width: `${Math.min(100, (subscription.usage.used / subscription.usage.limit) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* C-end: Value-added Reports */}
        {!isEnterprise && (
          <section>
            <h2 className="text-xl font-semibold text-[#2d2d28] mb-4">增值报告</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {reports.map(report => {
                const isPaying = paying === report.id
                return (
                  <div
                    key={report.id}
                    className="p-5 rounded-xl border border-[#e0dfd7] bg-white hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-semibold text-[#2d2d28] mb-1">{report.name}</h3>
                    <p className="text-sm text-[#87867f] mb-3 min-h-[40px]">{report.description}</p>
                    <div className="mb-4">
                      <span className="text-2xl font-bold text-[#2d2d28]">¥{report.priceYuan}</span>
                      <span className="text-sm text-[#87867f]"> / 一次性</span>
                    </div>
                    <button
                      onClick={() => handleBuyReport(report.id)}
                      disabled={isPaying}
                      className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                        isPaying
                          ? 'bg-[#87867f] text-white animate-pulse'
                          : 'bg-[#2d2d28] text-[#f5f4ed] hover:bg-[#3d3d38]'
                      }`}
                    >
                      {isPaying ? '支付中...' : '购买'}
                    </button>
                  </div>
                )
              })}
            </div>
            <p className="mt-4 text-xs text-[#87867f]">
              · 报告基于你的试炼评估数据，由 AI 深度分析生成。购买后可随时查看。
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
