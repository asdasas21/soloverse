import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Users, Briefcase, Search, Award, TrendingUp, Plus, X, Filter } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

// 企业端 API 基础地址（client.ts 未提供企业端函数，直接用 fetch 调用）
const API_BASE = import.meta.env.VITE_API_BASE || '/api'

// 统一获取认证 headers
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

// 六维能力维度配色（参考 AbilityDNA）
const DIM_COLORS: Record<string, string> = {
  curiosity: '#6366f1',
  reliability: '#4a8c6f',
  factChecking: '#f59e0b',
  diverseThinking: '#ec4899',
  uncertaintyTolerance: '#06b6d4',
  lowEgoHighDrive: '#c96442',
}

// 六维维度中文名
const DIM_LABELS: Record<string, string> = {
  curiosity: '好奇心',
  reliability: '靠谱',
  factChecking: '事实洁癖',
  diverseThinking: '多元化思维',
  uncertaintyTolerance: '忍受不确定性',
  lowEgoHighDrive: '低ego高自驱',
}

// 认证等级颜色：C1/C2/C3
const LEVEL_COLORS: Record<string, string> = {
  C1: '#8b7355',
  C2: '#c96442',
  C3: '#4a8c6f',
}

const LEVEL_NAMES: Record<string, string> = {
  C1: '基础认证',
  C2: '专业认证',
  C3: '专家认证',
}

// 候选人卡片中的迷你六维条形图
function MiniBarChart({ portrait }: { portrait: Record<string, number> }) {
  const dims = Object.keys(DIM_COLORS)
  return (
    <div className="flex items-end gap-1 h-10">
      {dims.map((dim) => {
        const score = portrait[dim] ?? 0
        return (
          <div
            key={dim}
            className="flex-1 rounded-sm"
            style={{
              height: `${Math.max(score, 4)}%`,
              background: DIM_COLORS[dim],
              opacity: 0.5 + (score / 100) * 0.5,
            }}
            title={`${DIM_LABELS[dim]}: ${Math.round(score)}`}
          />
        )
      })}
    </div>
  )
}

// 统计指标卡片
function StatCard({
  icon,
  label,
  value,
  index,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="rounded-xl p-5 border"
      style={{
        background: '#ffffff',
        borderColor: '#e8e6dc',
        boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs" style={{ color: '#87867f' }}>
            {label}
          </div>
          <div
            className="text-2xl font-bold mt-1"
            style={{ fontFamily: "'Playfair Display', serif", color: '#141413' }}
          >
            {value}
          </div>
        </div>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(201,100,66,0.1)', color: '#c96442' }}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  )
}

// 候选人卡片
function CandidateCard({
  candidate,
  index,
  onClick,
}: {
  candidate: any
  index: number
  onClick: () => void
}) {
  const level = candidate.certLevel || candidate.level
  const score = candidate.certScore ?? candidate.score ?? 0
  const portrait = candidate.portrait || {}
  const initials = (candidate.displayName || candidate.name || '匿名').slice(0, 2)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      whileHover={{ y: -4, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
      onClick={onClick}
      className="rounded-xl p-5 border cursor-pointer transition-all"
      style={{
        background: '#ffffff',
        borderColor: '#e8e6dc',
        boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.04)',
      }}
    >
      {/* 头部：头像 + 姓名 + 标题 */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ background: level ? LEVEL_COLORS[level] || '#a89888' : '#a89888' }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-base font-semibold truncate"
            style={{ color: '#141413', fontFamily: "'Playfair Display', serif" }}
          >
            {candidate.displayName || candidate.name || '匿名用户'}
          </div>
          <div className="text-xs truncate" style={{ color: '#87867f' }}>
            {candidate.title || candidate.bio || '—'}
          </div>
        </div>
      </div>

      {/* 认证等级徽章 + 综合分 */}
      <div className="flex items-center justify-between mb-4">
        {level ? (
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{
              background: `${LEVEL_COLORS[level]}20`,
              color: LEVEL_COLORS[level],
            }}
          >
            <Award size={12} /> {level} {LEVEL_NAMES[level] || ''}
          </span>
        ) : (
          <span
            className="text-xs px-2.5 py-1 rounded-full"
            style={{ background: '#f5f4ed', color: '#87867f' }}
          >
            未认证
          </span>
        )}
        <div className="flex items-baseline gap-1">
          <span
            className="text-lg font-bold"
            style={{ color: '#c96442' }}
          >
            {Math.round(score)}
          </span>
          <span className="text-xs" style={{ color: '#87867f' }}>
            综合分
          </span>
        </div>
      </div>

      {/* 迷你六维条形图 */}
      <MiniBarChart portrait={portrait} />
    </motion.div>
  )
}

// 候选人详情侧边栏
function CandidateDetail({
  candidate,
  onClose,
}: {
  candidate: any
  onClose: () => void
}) {
  const level = candidate.certLevel || candidate.level
  const score = candidate.certScore ?? candidate.score ?? 0
  const portrait = candidate.portrait || {}
  const initials = (candidate.displayName || candidate.name || '匿名').slice(0, 2)
  const trialHistory = candidate.trialHistory || []

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(20,20,19,0.4)' }}
        onClick={onClose}
      />
      {/* 侧边栏 */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.3 }}
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md overflow-y-auto"
        style={{ background: '#faf9f5', boxShadow: '-8px 0 30px rgba(0,0,0,0.1)' }}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[#e8e6dc] transition-colors z-10"
          style={{ color: '#5e5d59' }}
        >
          <X size={20} />
        </button>

        <div className="p-6 pt-16">
          {/* 头部 */}
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0"
              style={{ background: level ? LEVEL_COLORS[level] || '#a89888' : '#a89888' }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2
                className="text-xl font-bold truncate"
                style={{ fontFamily: "'Playfair Display', serif", color: '#141413' }}
              >
                {candidate.displayName || candidate.name || '匿名用户'}
              </h2>
              <div className="text-sm" style={{ color: '#87867f' }}>
                {candidate.title || ''}
              </div>
            </div>
          </div>

          {/* 认证 + 综合分 */}
          <div className="flex items-center gap-3 mb-6">
            {level && (
              <span
                className="inline-flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-full"
                style={{
                  background: `${LEVEL_COLORS[level]}20`,
                  color: LEVEL_COLORS[level],
                }}
              >
                <Award size={14} /> {level} {LEVEL_NAMES[level] || ''}
              </span>
            )}
            <span
              className="text-sm"
              style={{ color: '#5e5d59' }}
            >
              综合分 <strong style={{ color: '#c96442' }}>{Math.round(score)}</strong>
            </span>
          </div>

          {/* 完整能力画像 */}
          <div
            className="rounded-xl p-5 border mb-6"
            style={{ background: '#ffffff', borderColor: '#e8e6dc' }}
          >
            <h3
              className="text-base font-bold mb-4"
              style={{ fontFamily: "'Playfair Display', serif", color: '#141413' }}
            >
              完整能力画像
            </h3>
            <div className="space-y-3">
              {Object.keys(DIM_COLORS).map((dim) => {
                const dimScore = portrait[dim] ?? 0
                return (
                  <div key={dim}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs" style={{ color: '#5e5d59' }}>
                        {DIM_LABELS[dim]}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: '#141413' }}>
                        {Math.round(dimScore)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: '#e8e6dc' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${dimScore}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ background: DIM_COLORS[dim] }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 历史试炼记录 */}
          <div>
            <h3
              className="text-base font-bold mb-3"
              style={{ fontFamily: "'Playfair Display', serif", color: '#141413' }}
            >
              历史试炼记录
            </h3>
            {trialHistory.length === 0 ? (
              <p className="text-sm" style={{ color: '#87867f' }}>
                暂无试炼记录
              </p>
            ) : (
              <div className="space-y-2">
                {trialHistory.map((t: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg px-4 py-3 border"
                    style={{ background: '#ffffff', borderColor: '#e8e6dc' }}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: '#141413' }}>
                        {t.name || t.trialName || t.trialId || '试炼'}
                      </div>
                      <div className="text-xs" style={{ color: '#87867f' }}>
                        {t.date || ''} · {t.status === 'evaluated' ? '已完成' : t.status === 'in_progress' ? '进行中' : (t.status || '未知')}
                      </div>
                    </div>
                    {t.score !== undefined && (
                      <span className="font-bold" style={{ color: '#c96442' }}>
                        {t.score}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  )
}

// 发布新试炼表单
function CreateTrialForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (data: any) => Promise<void>
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    difficulty: 'intermediate',
    duration: '30',
    systemPrompt: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setFormError('请输入试炼标题')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      await onSubmit(form)
      onClose()
    } catch (err: any) {
      setFormError(err.message || '发布失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 z-40 flex items-center justify-center p-4"
        style={{ background: 'rgba(20,20,19,0.4)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-xl overflow-hidden"
          style={{ background: '#faf9f5', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        >
          {/* 头部 */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: '#e8e6dc' }}
          >
            <h2
              className="text-lg font-bold"
              style={{ fontFamily: "'Playfair Display', serif", color: '#141413' }}
            >
              发布新试炼
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#e8e6dc] transition-colors"
              style={{ color: '#5e5d59' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* 标题 */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#141413' }}>
                试炼标题 <span style={{ color: '#c96442' }}>*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="例如：高并发系统设计挑战"
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#c96442] transition-colors"
                style={{ background: '#ffffff', borderColor: '#e8e6dc', color: '#141413' }}
              />
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#141413' }}>
                试炼描述
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="描述试炼的考察重点和场景..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#c96442] transition-colors resize-none"
                style={{ background: '#ffffff', borderColor: '#e8e6dc', color: '#141413' }}
              />
            </div>

            {/* 难度 + 时长 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#141413' }}>
                  难度
                </label>
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#c96442] transition-colors"
                  style={{ background: '#ffffff', borderColor: '#e8e6dc', color: '#141413' }}
                >
                  <option value="beginner">入门</option>
                  <option value="intermediate">进阶</option>
                  <option value="advanced">高级</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#141413' }}>
                  时长（分钟）
                </label>
                <input
                  type="number"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  min="5"
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#c96442] transition-colors"
                  style={{ background: '#ffffff', borderColor: '#e8e6dc', color: '#141413' }}
                />
              </div>
            </div>

            {/* System Prompt */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#141413' }}>
                评估重点说明（可选）
              </label>
              <textarea
                value={form.systemPrompt}
                onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                placeholder="定义试炼的考察重点、难度要求和评分维度偏好..."
                rows={4}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#c96442] transition-colors resize-none"
                style={{ background: '#ffffff', borderColor: '#e8e6dc', color: '#141413' }}
              />
            </div>

            {/* 错误提示 */}
            {formError && (
              <div
                className="text-sm px-3 py-2 rounded-lg"
                style={{ background: 'rgba(201,100,66,0.1)', color: '#c96442' }}
              >
                {formError}
              </div>
            )}

            {/* 按钮 */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors hover:bg-[#e8e6dc]"
                style={{ borderColor: '#e8e6dc', color: '#5e5d59' }}
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-60"
                style={{ background: '#c96442' }}
              >
                {submitting ? '发布中...' : '发布试炼'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </>
  )
}

// 定制试炼卡片
function TrialCard({ trial, index }: { trial: any; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="rounded-xl p-5 border"
      style={{
        background: '#ffffff',
        borderColor: '#e8e6dc',
        boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <h3
          className="text-base font-semibold"
          style={{ fontFamily: "'Playfair Display', serif", color: '#141413' }}
        >
          {trial.title || '未命名试炼'}
        </h3>
        {trial.difficulty && (
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: '#f5f4ed', color: '#5e5d59' }}
          >
            {trial.difficulty === 'beginner' ? '入门' : trial.difficulty === 'advanced' ? '高级' : '进阶'}
          </span>
        )}
      </div>

      {trial.description && (
        <p className="text-sm mb-4 leading-relaxed line-clamp-2" style={{ color: '#5e5d59' }}>
          {trial.description}
        </p>
      )}

      {/* 参与人数 + 平均分 */}
      <div className="flex items-center gap-4 text-xs" style={{ color: '#87867f' }}>
        <span className="flex items-center gap-1.5">
          <Users size={14} /> {trial.participants ?? 0} 人参与
        </span>
        <span className="flex items-center gap-1.5">
          <TrendingUp size={14} /> 平均分 {trial.avgScore ?? '—'}
        </span>
        {trial.duration && (
          <span className="flex items-center gap-1.5">
            <Briefcase size={14} /> {trial.duration}分钟
          </span>
        )}
      </div>
    </motion.div>
  )
}

export default function EnterpriseDashboard() {
  const [activeTab, setActiveTab] = useState<'candidates' | 'trials'>('candidates')
  const [candidates, setCandidates] = useState<any[]>([])
  const [customTrials, setCustomTrials] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterLevel, setFilterLevel] = useState<string>('')
  const [minScore, setMinScore] = useState<number>(0)
  const [filterDim, setFilterDim] = useState<string>('')
  const [minDimScore, setMinDimScore] = useState<number>(0)
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null)
  const [showCreateTrial, setShowCreateTrial] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  // 获取候选人列表
  const fetchCandidates = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_BASE}/enterprise/candidates`, { headers })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || `请求失败 (${res.status})`)
      }
      const data = await res.json()
      setCandidates(data.data || data || [])
      setApiError(null)
    } catch (err: any) {
      setApiError(err.message || '获取候选人列表失败')
      setCandidates([])
    }
  }, [])

  // 获取定制试炼列表
  const fetchTrials = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_BASE}/enterprise/trials`, { headers })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || `请求失败 (${res.status})`)
      }
      const data = await res.json()
      setCustomTrials(data.data || data || [])
    } catch (err: any) {
      // 试炼接口失败不阻塞整体加载，静默处理
      console.warn('[enterprise] 获取试炼列表失败:', err.message)
      setCustomTrials([])
    }
  }, [])

  // 获取候选人详情
  const fetchCandidateDetail = useCallback(async (id: string) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_BASE}/enterprise/profile/${id}`, { headers })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || `请求失败 (${res.status})`)
      }
      const data = await res.json()
      const detail = data.data || data
      // 合并详情数据到当前候选人，保留列表中已有的基本信息
      setSelectedCandidate((prev: any) => ({
        ...prev,
        ...detail.profile,
        ...detail.latestEvaluation,
        trialHistory: detail.trialHistory || [],
        certificates: detail.certificates || [],
        stats: detail.stats || {},
      }))
    } catch (err: any) {
      // 详情获取失败时，使用列表中的数据
      console.warn('[enterprise] 获取候选人详情失败:', err.message)
    }
  }, [])

  // 发布定制试炼
  const handleCreateTrial = useCallback(async (formData: any) => {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE}/enterprise/trials`, {
      method: 'POST',
      headers,
      body: JSON.stringify(formData),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || `发布失败 (${res.status})`)
    }
    const data = await res.json()
    // 添加到列表头部
    setCustomTrials((prev) => [data.data || data, ...prev])
  }, [])

  // 初始加载
  useEffect(() => {
    let cancelled = false
    Promise.all([fetchCandidates(), fetchTrials()])
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fetchCandidates, fetchTrials])

  // 筛选后的候选人列表（memoize 避免不必要重计算）
  const filteredCandidates = useMemo(() => candidates.filter((c) => {
    const name = (c.displayName || c.name || '').toLowerCase()
    const matchesSearch = !searchQuery || name.includes(searchQuery.toLowerCase())
    const level = c.certLevel || c.level
    const matchesLevel = !filterLevel || level === filterLevel
    const score = c.certScore ?? c.score ?? 0
    const matchesScore = score >= minScore
    // 维度筛选
    const portrait = c.portrait || {}
    const matchesDim = !filterDim || (portrait[filterDim] ?? 0) >= minDimScore
    return matchesSearch && matchesLevel && matchesScore && matchesDim
  }), [candidates, searchQuery, filterLevel, minScore, filterDim, minDimScore])

  // 统计指标
  const totalCandidates = candidates.length
  const avgScore =
    candidates.length > 0
      ? Math.round(
          candidates.reduce((sum, c) => sum + (c.certScore ?? c.score ?? 0), 0) /
            candidates.length
        )
      : 0
  const totalTrials = customTrials.length

  // 点击候选人卡片
  const handleCandidateClick = (candidate: any) => {
    setSelectedCandidate(candidate)
    const id = candidate.id || candidate.userId
    if (id) {
      fetchCandidateDetail(id)
    }
  }

  return (
    <div
      className="min-h-screen pb-12"
      style={{ background: '#faf9f5', fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {/* 返回首页 + 订阅管理 */}
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm"
            style={{ color: '#5e5d59' }}
          >
            <i className="bi bi-arrow-left" /> 返回首页
          </Link>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: '#c96442', color: '#fff' }}
          >
            <i className="bi bi-gear-wide-connected" /> 订阅管理
          </Link>
        </div>

        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-6"
        >
          <Briefcase size={28} style={{ color: '#c96442' }} />
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "'Playfair Display', serif", color: '#141413' }}
          >
            企业端仪表盘
          </h1>
        </motion.div>

        {/* 顶部统计栏 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={<Users size={20} />}
            label="候选人总数"
            value={totalCandidates}
            index={0}
          />
          <StatCard
            icon={<Award size={20} />}
            label="平均认证分"
            value={avgScore}
            index={1}
          />
          <StatCard
            icon={<Briefcase size={20} />}
            label="已发布试炼数"
            value={totalTrials}
            index={2}
          />
        </div>

        {/* Tab 导航 */}
        <div
          className="flex gap-1 mb-6 p-1 rounded-xl w-full sm:w-auto"
          style={{ background: '#e8e6dc' }}
        >
          <button
            onClick={() => setActiveTab('candidates')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === 'candidates' ? '#ffffff' : 'transparent',
              color: activeTab === 'candidates' ? '#141413' : '#5e5d59',
              boxShadow: activeTab === 'candidates' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <Users size={16} /> 候选人库
          </button>
          <button
            onClick={() => setActiveTab('trials')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === 'trials' ? '#ffffff' : 'transparent',
              color: activeTab === 'trials' ? '#141413' : '#5e5d59',
              boxShadow: activeTab === 'trials' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <Briefcase size={16} /> 定制试炼
          </button>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-[#e8e6dc] border-t-[#c96442] rounded-full animate-spin" />
          </div>
        )}

        {/* API 错误提示（如 403 权限不足） */}
        {!loading && apiError && activeTab === 'candidates' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl p-8 text-center border mb-6"
            style={{ background: '#ffffff', borderColor: '#e8e6dc' }}
          >
            <i
              className="bi bi-shield-lock"
              style={{ fontSize: '36px', color: '#c96442' }}
            />
            <h3
              className="text-lg font-semibold mt-3 mb-1"
              style={{ color: '#141413' }}
            >
              无法访问候选人数据
            </h3>
            <p className="text-sm" style={{ color: '#87867f' }}>
              {apiError}
            </p>
            <p className="text-xs mt-2" style={{ color: '#87867f' }}>
              请确认您已获得企业端访问权限，或稍后重试。
            </p>
          </motion.div>
        )}

        {/* 候选人库 Tab */}
        {!loading && activeTab === 'candidates' && !apiError && (
          <>
            {/* 搜索 + 筛选器 */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              {/* 搜索框 */}
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#87867f' }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索候选人姓名..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm outline-none focus:border-[#c96442] transition-colors"
                  style={{ background: '#ffffff', borderColor: '#e8e6dc', color: '#141413' }}
                />
              </div>

              {/* 认证等级筛选 */}
              <div className="relative">
                <Filter
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: '#87867f' }}
                />
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="pl-9 pr-8 py-2.5 rounded-lg border text-sm outline-none focus:border-[#c96442] transition-colors appearance-none cursor-pointer"
                  style={{ background: '#ffffff', borderColor: '#e8e6dc', color: '#141413' }}
                >
                  <option value="">全部等级</option>
                  <option value="C1">C1 基础认证</option>
                  <option value="C2">C2 专业认证</option>
                  <option value="C3">C3 专家认证</option>
                </select>
              </div>

              {/* 最低综合分 */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border" style={{ background: '#ffffff', borderColor: '#e8e6dc' }}>
                <span className="text-xs whitespace-nowrap" style={{ color: '#87867f' }}>
                  最低分
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-20 cursor-pointer"
                  style={{ accentColor: '#c96442' }}
                />
                <span className="text-xs font-semibold w-6 text-center" style={{ color: '#c96442' }}>
                  {minScore}
                </span>
              </div>

              {/* 维度筛选 */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border" style={{ background: '#ffffff', borderColor: '#e8e6dc' }}>
                <select
                  value={filterDim}
                  onChange={(e) => setFilterDim(e.target.value)}
                  className="text-xs outline-none cursor-pointer bg-transparent"
                  style={{ color: '#141413' }}
                >
                  <option value="">全部维度</option>
                  <option value="curiosity">好奇心</option>
                  <option value="reliability">靠谱</option>
                  <option value="factChecking">事实洁癖</option>
                  <option value="diverseThinking">多元化思维</option>
                  <option value="uncertaintyTolerance">忍受不确定性</option>
                  <option value="lowEgoHighDrive">低ego高自驱</option>
                </select>
                {filterDim && (
                  <>
                    <span className="text-xs" style={{ color: '#87867f' }}>≥</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={minDimScore}
                      onChange={(e) => setMinDimScore(Number(e.target.value))}
                      className="w-16 cursor-pointer"
                      style={{ accentColor: DIM_COLORS[filterDim] || '#c96442' }}
                    />
                    <span className="text-xs font-semibold w-6 text-center" style={{ color: DIM_COLORS[filterDim] || '#c96442' }}>
                      {minDimScore}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* 候选人卡片网格 */}
            {filteredCandidates.length === 0 ? (
              <div className="text-center py-20">
                <i
                  className="bi bi-search"
                  style={{ fontSize: '36px', color: '#87867f' }}
                />
                <p className="text-sm mt-3" style={{ color: '#87867f' }}>
                  {candidates.length === 0 ? '暂无候选人数据' : '没有匹配的候选人'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCandidates.map((c, i) => (
                  <CandidateCard
                    key={c.id || c.userId || i}
                    candidate={c}
                    index={i}
                    onClick={() => handleCandidateClick(c)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* 定制试炼 Tab */}
        {!loading && activeTab === 'trials' && (
          <>
            {/* 发布新试炼按钮 */}
            <div className="mb-6">
              <button
                onClick={() => setShowCreateTrial(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
                style={{ background: '#c96442' }}
              >
                <Plus size={16} /> 发布新试炼
              </button>
            </div>

            {/* 试炼列表 */}
            {customTrials.length === 0 ? (
              <div className="text-center py-20">
                <i
                  className="bi bi-briefcase"
                  style={{ fontSize: '36px', color: '#87867f' }}
                />
                <p className="text-sm mt-3" style={{ color: '#87867f' }}>
                  还没有发布任何定制试炼
                </p>
                <p className="text-xs mt-1" style={{ color: '#87867f' }}>
                  点击上方按钮发布你的第一个试炼
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customTrials.map((t, i) => (
                  <TrialCard key={t.id || i} trial={t} index={i} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 候选人详情侧边栏 */}
      <AnimatePresence>
        {selectedCandidate && (
          <CandidateDetail
            candidate={selectedCandidate}
            onClose={() => setSelectedCandidate(null)}
          />
        )}
      </AnimatePresence>

      {/* 发布新试炼表单 */}
      <AnimatePresence>
        {showCreateTrial && (
          <CreateTrialForm
            onClose={() => setShowCreateTrial(false)}
            onSubmit={handleCreateTrial}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
