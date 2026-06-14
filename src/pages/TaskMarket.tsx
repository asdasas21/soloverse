import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Plus, Users, Award, ArrowLeft, ChevronRight } from 'lucide-react'
import {
  getTasks, createTask, applyForTask, getMyParticipatedTasks, getMyCreatedTasks,
  type Task,
} from '@/api/client'
import { useToast } from '@/components/Toast'
import { Skeleton } from '@/components/Skeleton'
import { useAuthStore } from '@/store/authStore'

const STATUS_LABELS: Record<string, string> = {
  open: '招募中',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
}

const STATUS_COLORS: Record<string, string> = {
  open: '#4a8c6f',
  in_progress: '#c96442',
  completed: '#87867f',
  cancelled: '#c0c0c0',
}

export default function TaskMarket() {
  const navigate = useNavigate()
  const { show } = useToast()
  const { isEnterprise } = useAuthStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [activeTab, setActiveTab] = useState<'discover' | 'mine' | 'created'>(isEnterprise ? 'created' : 'discover')
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (activeTab === 'discover') {
        const res = await getTasks('open')
        const data = (res as any).data ?? res
        setTasks(data.tasks ?? [])
      } else if (activeTab === 'mine') {
        const res = await getMyParticipatedTasks()
        const data = (res as any).data ?? res
        setTasks((data ?? []).map((a: any) => a.task).filter(Boolean))
      } else {
        const res = await getMyCreatedTasks()
        const data = (res as any).data ?? res
        setTasks(data ?? [])
      }
    } catch {
      show('加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => { loadData() }, [loadData])

  const handleApply = async (taskId: string) => {
    try {
      await applyForTask(taskId, '我对这个任务很感兴趣，希望能参与协作。')
      show('申请已提交！', 'success')
    } catch (e) {
      show(e instanceof Error ? e.message : '申请失败', 'error')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6" style={{ background: '#f5f4ed' }}>
        <div className="max-w-4xl mx-auto pt-8">
          <Skeleton width="40%" height={32} className="mb-6" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} height={120} />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: '#f5f4ed' }}>
      <div className="max-w-4xl mx-auto px-6 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => navigate(-1)} className="text-sm text-[#87867f] hover:text-[#5e5d59] mb-2">
              ← 返回
            </button>
            <h1 className="text-2xl font-bold text-[#2d2d28]" style={{ fontFamily: "'Playfair Display', serif" }}>
              任务广场
            </h1>
            <p className="text-sm text-[#87867f] mt-1">真实项目任务 · 用交付证明你的能力</p>
          </div>
          {isEnterprise && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: '#2d2d28', color: '#f5f4ed' }}
            >
              <Plus size={16} /> 发布任务
            </button>
          )}
          {!isEnterprise && (
            <span className="text-xs text-[#87867f]">任务由企业端发布，你可浏览并申请参与</span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl bg-white/50 border border-[#e0dfd7]">
          {([
            { key: 'discover' as const, label: '发现任务' },
            { key: 'mine' as const, label: '我参与的' },
            ...(isEnterprise ? [{ key: 'created' as const, label: '我发布的' }] : []),
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key ? 'bg-[#2d2d28] text-[#f5f4ed]' : 'text-[#87867f] hover:text-[#5e5d59]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Task List */}
        {tasks.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4 opacity-30">📋</div>
            <p className="text-[#87867f] mb-4">
              {activeTab === 'discover' ? '暂无开放任务' : activeTab === 'mine' ? '你还没有参与任何任务' : '你还没有发布任务'}
            </p>
            {isEnterprise && activeTab === 'created' && (
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: '#2d2d28', color: '#f5f4ed' }}
              >
                <Plus size={16} /> 发布第一个任务
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-5 rounded-xl border border-[#e0dfd7] bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: `${STATUS_COLORS[task.status]}15`, color: STATUS_COLORS[task.status] }}
                      >
                        {STATUS_LABELS[task.status] || task.status}
                      </span>
                      {task.required_cert_level && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#c96442]/10 text-[#c96442] font-medium">
                          需 {task.required_cert_level}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-[#2d2d28] mb-1">{task.title}</h3>
                    <p className="text-sm text-[#87867f] line-clamp-2">{task.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-[#87867f] mb-3">
                  <span className="flex items-center gap-1">
                    <Users size={12} /> {task.max_builders} 人
                  </span>
                  {task.reward_total > 0 && (
                    <span className="flex items-center gap-1">
                      <Award size={12} /> ¥{((task.reward_total / 100) * (task.deposit_ratio / 100)).toFixed(0)} 预付定金 / ¥{(task.reward_total / 100).toFixed(0)} 总报酬
                    </span>
                  )}
                  {task.creator?.display_name ? (
                    <span>发布者：{task.creator.display_name}</span>
                  ) : task.creator_id ? (
                    <span>企业发布者</span>
                  ) : null}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#87867f]">
                    {task.created_at?.slice(0, 10)}
                  </span>
                  {activeTab === 'discover' && task.status === 'open' && (
                    <button
                      onClick={() => handleApply(task.id)}
                      className="inline-flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: '#4a8c6f', color: '#fff' }}
                    >
                      申请任务 <ChevronRight size={14} />
                    </button>
                  )}
                  {(activeTab === 'mine' || activeTab === 'created') && (
                    <span className="text-xs text-[#87867f]">
                      {STATUS_LABELS[task.status] || task.status}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreate && (
        <CreateTaskModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); setActiveTab('created'); loadData() }}
        />
      )}
    </div>
  )
}

// ── 创建任务弹窗 ──

function CreateTaskModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { show } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    requirements: '',
    maxBuilders: 3,
    rewardTotal: 0,
    depositRatio: 30,
    category: 'general',
    requiredCertLevel: '' as string,
  })

  const handleSubmit = async () => {
    if (form.title.length < 3 || form.description.length < 10) {
      show('标题至少3字，描述至少10字', 'error')
      return
    }
    setSubmitting(true)
    try {
      await createTask({
        title: form.title,
        description: form.description,
        requirements: form.requirements || undefined,
        maxBuilders: form.maxBuilders,
        rewardTotal: form.rewardTotal,
        depositRatio: form.depositRatio,
        category: form.category,
        requiredCertLevel: form.requiredCertLevel || null,
      })
      show('任务发布成功！', 'success')
      onCreated()
    } catch (e) {
      show(e instanceof Error ? e.message : '发布失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#2d2d28]">发布任务</h2>
          <button onClick={onClose} className="text-[#87867f] hover:text-[#2d2d28]">
            <ArrowLeft size={18} className="rotate-90" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#2d2d28] mb-1 block">任务标题 *</label>
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="例如：构建 RAG 检索增强生成系统"
              className="w-full px-3 py-2 rounded-lg border border-[#e0dfd7] text-sm focus:outline-none focus:border-[#2d2d28]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#2d2d28] mb-1 block">任务描述 *</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="详细描述任务目标、交付要求、技术栈..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-[#e0dfd7] text-sm focus:outline-none focus:border-[#2d2d28] resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#2d2d28] mb-1 block">技术要求</label>
            <input
              value={form.requirements}
              onChange={e => setForm({ ...form, requirements: e.target.value })}
              placeholder="例如：熟悉 React + TypeScript，有 RAG 经验"
              className="w-full px-3 py-2 rounded-lg border border-[#e0dfd7] text-sm focus:outline-none focus:border-[#2d2d28]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-[#2d2d28] mb-1 block">招募人数</label>
              <input
                type="number"
                value={form.maxBuilders}
                onChange={e => setForm({ ...form, maxBuilders: Math.max(1, Number(e.target.value)) })}
                className="w-full px-3 py-2 rounded-lg border border-[#e0dfd7] text-sm focus:outline-none focus:border-[#2d2d28]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#2d2d28] mb-1 block">认证要求</label>
              <select
                value={form.requiredCertLevel}
                onChange={e => setForm({ ...form, requiredCertLevel: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#e0dfd7] text-sm focus:outline-none focus:border-[#2d2d28]"
              >
                <option value="">不限</option>
                <option value="C1">C1 基础认证</option>
                <option value="C2">C2 专业认证</option>
                <option value="C3">C3 专家认证</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-[#2d2d28] mb-1 block">总奖励（元）</label>
              <input
                type="number"
                value={form.rewardTotal === 0 ? '' : form.rewardTotal / 100}
                onChange={e => setForm({ ...form, rewardTotal: Math.round(Number(e.target.value) * 100) })}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-[#e0dfd7] text-sm focus:outline-none focus:border-[#2d2d28]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#2d2d28] mb-1 block">定金比例（%）</label>
              <input
                type="number"
                value={form.depositRatio}
                onChange={e => setForm({ ...form, depositRatio: Math.max(0, Math.min(100, Number(e.target.value))) })}
                className="w-full px-3 py-2 rounded-lg border border-[#e0dfd7] text-sm focus:outline-none focus:border-[#2d2d28]"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-[#e0dfd7] text-[#5e5d59] hover:bg-[#f5f4ed]"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: '#2d2d28', color: '#f5f4ed' }}
          >
            {submitting ? '发布中...' : '发布任务'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
