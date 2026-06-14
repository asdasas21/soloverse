import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Plus, Code2, Trash2, Edit3, Eye, Copy, Zap, ShieldCheck,
  Terminal, BookOpen, Check, X, Rocket, FileText, Layers,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

// API 基础地址
const API_BASE = import.meta.env.VITE_API_BASE || '/api'

// Skill 类型定义（与数据库字段对齐）
type SkillKind = 'api' | 'protocol' | 'hybrid'
type SkillStatus = 'draft' | 'published' | 'verified' | 'revoked'

interface Skill {
  id: string
  title: string
  description: string
  kind: SkillKind
  status: SkillStatus
  endpoint: string
  protocol: any
  invoke_count?: number
  last_invoked_at?: string | null
  invocation_count?: number
  created_at: string
}

// 类型徽章配色
const kindConfig: Record<SkillKind, { label: string; color: string; bg: string }> = {
  api: { label: 'API 接口', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  protocol: { label: '试炼协议', color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
  hybrid: { label: '混合', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
}

// 状态徽章配置
const statusConfig: Record<SkillStatus, { label: string; color: string; bg: string }> = {
  draft: { label: '草稿', color: '#87867f', bg: 'rgba(135,134,127,0.12)' },
  published: { label: '已发布', color: '#4a8c6f', bg: 'rgba(74,140,111,0.12)' },
  verified: { label: '已验证', color: '#fbbf24', bg: 'rgba(251,191,36,0.14)' },
  revoked: { label: '已撤销', color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
}

// 格式化时间
function formatTime(iso?: string | null): string {
  if (!iso) return '从未调用'
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

// 统一获取调用次数（兼容 invoke_count / invocation_count）
function getInvokeCount(skill: Skill): number {
  return skill.invoke_count ?? skill.invocation_count ?? 0
}

// 复制按钮组件
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // 忽略剪贴板错误
    }
  }
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs transition-colors"
      style={{ color: copied ? '#4a8c6f' : '#87867f' }}
      title={label || '复制'}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {label && <span>{copied ? '已复制' : label}</span>}
    </button>
  )
}

// ============================================================
// Skill 卡片组件
// ============================================================
function SkillCard({
  skill,
  onEdit,
  onPublish,
  onDelete,
  onViewLogs,
  onTest,
}: {
  skill: Skill
  onEdit: (s: Skill) => void
  onPublish: (s: Skill) => void
  onDelete: (s: Skill) => void
  onViewLogs: (s: Skill) => void
  onTest: (s: Skill) => void
}) {
  const kCfg = kindConfig[skill.kind] || kindConfig.api
  const sCfg = statusConfig[skill.status] || statusConfig.draft
  const isPublished = skill.status === 'published' || skill.status === 'verified'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
      className="rounded-xl border border-[#e8e6dc] p-5 flex flex-col"
      style={{ background: '#ffffff' }}
    >
      {/* 标题行 */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <h3
          className="text-base font-semibold leading-tight flex-1"
          style={{ color: '#141413', fontFamily: "'Playfair Display', serif" }}
        >
          {skill.title}
        </h3>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
          style={{ color: kCfg.color, background: kCfg.bg }}
        >
          {kCfg.label}
        </span>
      </div>

      {/* 描述 */}
      <p className="text-xs text-[#5e5d59] mb-3 leading-relaxed min-h-[32px]">
        {skill.description || '暂无描述'}
      </p>

      {/* 状态徽章 */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ color: sCfg.color, background: sCfg.bg }}
        >
          {skill.status === 'verified' && <ShieldCheck size={10} />}
          {sCfg.label}
        </span>
      </div>

      {/* 调用统计 */}
      <div className="flex items-center gap-3 text-[11px] text-[#87867f] mb-3">
        <span className="flex items-center gap-1">
          <Zap size={11} />
          调用 {getInvokeCount(skill)}
        </span>
        <span>·</span>
        <span>{formatTime(skill.last_invoked_at)}</span>
      </div>

      {/* Endpoint 地址 */}
      {isPublished && skill.endpoint && (
        <div className="flex items-center gap-2 mb-4 p-2 rounded-md border border-[#e8e6dc]" style={{ background: '#f5f4ed' }}>
          <code className="text-[10px] text-[#5e5d59] font-mono truncate flex-1">{skill.endpoint}</code>
          <CopyButton text={skill.endpoint} />
        </div>
      )}

      {/* 操作按钮 */}
      <div className="mt-auto grid grid-cols-2 gap-1.5">
        <button
          onClick={() => onEdit(skill)}
          className="flex items-center justify-center gap-1 text-[11px] py-1.5 rounded-md border border-[#e8e6dc] text-[#5e5d59] hover:bg-[#f5f4ed] transition-colors"
        >
          <Edit3 size={12} /> 编辑
        </button>
        <button
          onClick={() => onPublish(skill)}
          className="flex items-center justify-center gap-1 text-[11px] py-1.5 rounded-md text-white transition-opacity hover:opacity-90"
          style={{ background: isPublished ? '#87867f' : '#c96442' }}
        >
          {isPublished ? (
            <>
              <X size={12} /> 撤销
            </>
          ) : (
            <>
              <Rocket size={12} /> 发布
            </>
          )}
        </button>
        {isPublished && (
          <button
            onClick={() => onTest(skill)}
            className="flex items-center justify-center gap-1 text-[11px] py-1.5 rounded-md border text-white transition-opacity hover:opacity-90"
            style={{ borderColor: '#c96442', background: '#c96442' }}
          >
            <Terminal size={12} /> 测试调用
          </button>
        )}
        <button
          onClick={() => onViewLogs(skill)}
          className="flex items-center justify-center gap-1 text-[11px] py-1.5 rounded-md border border-[#e8e6dc] text-[#5e5d59] hover:bg-[#f5f4ed] transition-colors"
        >
          <Eye size={12} /> 调用历史
        </button>
        <button
          onClick={() => onDelete(skill)}
          className="col-span-2 flex items-center justify-center gap-1 text-[11px] py-1.5 rounded-md border border-[#e8e6dc] text-[#dc2626] hover:bg-[rgba(220,38,38,0.06)] transition-colors"
        >
          <Trash2 size={12} /> 删除
        </button>
      </div>
    </motion.div>
  )
}

// ============================================================
// 创建新 Skill 表单（内联于「创建新 Skill」Tab）
// ============================================================
function CreateSkillForm({
  onSubmit,
  onDone,
}: {
  onSubmit: (data: {
    title: string
    description: string
    kind: SkillKind
    protocol: any
    inputSchema: string
    outputSchema: string
  }) => Promise<void>
  onDone: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState<SkillKind>('api')
  const [inputSchema, setInputSchema] = useState('{\n  "type": "object",\n  "properties": {}\n}')
  const [outputSchema, setOutputSchema] = useState('{\n  "type": "object",\n  "properties": {}\n}')
  const [evaluationId, setEvaluationId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 校验并格式化 JSON
  const formatJson = (which: 'input' | 'output') => {
    const raw = which === 'input' ? inputSchema : outputSchema
    try {
      const parsed = JSON.parse(raw)
      const formatted = JSON.stringify(parsed, null, 2)
      if (which === 'input') setInputSchema(formatted)
      else setOutputSchema(formatted)
      setError(null)
    } catch (e) {
      setError(`${which === 'input' ? '输入' : '输出'} Schema JSON 格式错误：${(e as Error).message}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      setError('请填写标题和描述')
      return
    }
    // 校验 JSON
    let inputObj: any = {}
    let outputObj: any = {}
    try {
      inputObj = JSON.parse(inputSchema)
    } catch (err) {
      setError('输入 Schema JSON 格式错误：' + (err as Error).message)
      return
    }
    try {
      outputObj = JSON.parse(outputSchema)
    } catch (err) {
      setError('输出 Schema JSON 格式错误：' + (err as Error).message)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        title,
        description,
        kind,
        protocol: { input: inputObj, output: outputObj, evaluationId: evaluationId || undefined },
        inputSchema,
        outputSchema,
      })
      // 提交成功后由父组件切换 Tab
      onDone()
    } catch (err: any) {
      setError(err.message || '创建失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-[#e8e6dc] p-6"
      style={{ background: '#ffffff' }}
    >
      <h2 className="text-xl font-semibold mb-1" style={{ color: '#141413', fontFamily: "'Playfair Display', serif" }}>
        创建新 Skill
      </h2>
      <p className="text-xs text-[#87867f] mb-6">定义一个可被企业 Agent 调用的能力接口</p>

      {/* 标题 */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1.5" style={{ color: '#141413' }}>
          标题 <span style={{ color: '#c96442' }}>*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例如：代码审查 Skill"
          className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#c96442] transition-colors"
          style={{ background: '#ffffff', borderColor: '#e8e6dc', color: '#141413' }}
        />
      </div>

      {/* 描述 */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1.5" style={{ color: '#141413' }}>
          描述 <span style={{ color: '#c96442' }}>*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="简要描述这个 Skill 做什么、解决什么问题..."
          className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#c96442] transition-colors resize-none"
          style={{ background: '#ffffff', borderColor: '#e8e6dc', color: '#141413' }}
        />
      </div>

      {/* 类型 */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1.5" style={{ color: '#141413' }}>类型</label>
        <div className="grid grid-cols-3 gap-2">
          {(['api', 'protocol', 'hybrid'] as SkillKind[]).map((k) => {
            const cfg = kindConfig[k]
            return (
              <label
                key={k}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm cursor-pointer transition-colors"
                style={
                  kind === k
                    ? { borderColor: cfg.color, color: cfg.color, background: cfg.bg }
                    : { borderColor: '#e8e6dc', color: '#5e5d59', background: '#ffffff' }
                }
              >
                <input
                  type="radio"
                  name="kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => setKind(k)}
                  className="sr-only"
                />
                {cfg.label}
              </label>
            )
          })}
        </div>
      </div>

      {/* 输入 Schema */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium" style={{ color: '#141413' }}>输入 Schema (JSON)</label>
          <button
            type="button"
            onClick={() => formatJson('input')}
            className="text-[11px] text-[#c96442] hover:underline"
          >
            格式化
          </button>
        </div>
        <textarea
          value={inputSchema}
          onChange={(e) => setInputSchema(e.target.value)}
          rows={6}
          spellCheck={false}
          className="w-full px-3 py-2 rounded-lg border text-xs font-mono outline-none focus:border-[#c96442] transition-colors resize-none"
          style={{
            background: '#1a1a1a',
            color: '#f8f8f2',
            borderColor: '#e8e6dc',
          }}
        />
      </div>

      {/* 输出 Schema */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium" style={{ color: '#141413' }}>输出 Schema (JSON)</label>
          <button
            type="button"
            onClick={() => formatJson('output')}
            className="text-[11px] text-[#c96442] hover:underline"
          >
            格式化
          </button>
        </div>
        <textarea
          value={outputSchema}
          onChange={(e) => setOutputSchema(e.target.value)}
          rows={6}
          spellCheck={false}
          className="w-full px-3 py-2 rounded-lg border text-xs font-mono outline-none focus:border-[#c96442] transition-colors resize-none"
          style={{
            background: '#1a1a1a',
            color: '#f8f8f2',
            borderColor: '#e8e6dc',
          }}
        />
      </div>

      {/* 关联试炼 */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1.5" style={{ color: '#141413' }}>
          关联试炼（可选）
        </label>
        <div className="flex gap-2">
          <select
            value={evaluationId}
            onChange={(e) => setEvaluationId(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#c96442] transition-colors"
            style={{ background: '#ffffff', borderColor: '#e8e6dc', color: '#141413' }}
          >
            <option value="">不关联</option>
            <option value="code-review">代码审查评估</option>
            <option value="system-design">系统设计评估</option>
          </select>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors hover:bg-[#f5f4ed]"
            style={{ borderColor: '#e8e6dc', color: '#5e5d59' }}
            title="跳转到从试炼生成 Skill 流程"
          >
            <FileText size={14} /> 从试炼生成
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div
          className="text-sm px-3 py-2 rounded-lg mb-4"
          style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626' }}
        >
          {error}
        </div>
      )}

      {/* 提交按钮 */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onDone}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors hover:bg-[#f5f4ed]"
          style={{ borderColor: '#e8e6dc', color: '#5e5d59' }}
        >
          取消
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60"
          style={{ background: '#c96442' }}
        >
          {submitting ? '创建中...' : '创建 Skill'}
        </button>
      </div>
    </form>
  )
}

// ============================================================
// 编辑 Skill 的 Modal
// ============================================================
function EditSkillModal({
  skill,
  onClose,
  onSubmit,
}: {
  skill: Skill | null
  onClose: () => void
  onSubmit: (data: Partial<Skill>) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState<SkillKind>('api')
  const [protocolJson, setProtocolJson] = useState('{}')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 初始化表单
  useEffect(() => {
    if (skill) {
      setTitle(skill.title || '')
      setDescription(skill.description || '')
      setKind(skill.kind || 'api')
      try {
        setProtocolJson(JSON.stringify(skill.protocol || {}, null, 2))
      } catch {
        setProtocolJson('{}')
      }
      setError(null)
    }
  }, [skill])

  const handleSubmit = async () => {
    if (!skill) return
    if (!title.trim() || !description.trim()) {
      setError('请填写标题和描述')
      return
    }
    // 校验 JSON
    let protocolObj: any = {}
    try {
      protocolObj = JSON.parse(protocolJson)
    } catch (err) {
      setError('协议 JSON 格式错误：' + (err as Error).message)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        id: skill.id,
        title,
        description,
        kind,
        protocol: protocolObj,
      })
      onClose()
    } catch (err: any) {
      setError(err.message || '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {skill && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(20,20,19,0.4)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="rounded-2xl border w-full max-w-lg max-h-[90vh] overflow-y-auto"
            style={{ background: '#faf9f5', borderColor: '#e8e6dc' }}
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-semibold" style={{ color: '#141413', fontFamily: "'Playfair Display', serif" }}>
                  编辑 Skill
                </h2>
                <button onClick={onClose} className="text-[#87867f] hover:text-[#141413]">
                  <X size={20} />
                </button>
              </div>

              {/* 标题 */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#141413' }}>标题</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#c96442] transition-colors"
                  style={{ background: '#ffffff', borderColor: '#e8e6dc', color: '#141413' }}
                />
              </div>

              {/* 描述 */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#141413' }}>描述</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[#c96442] transition-colors resize-none"
                  style={{ background: '#ffffff', borderColor: '#e8e6dc', color: '#141413' }}
                />
              </div>

              {/* 类型 */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#141413' }}>类型</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['api', 'protocol', 'hybrid'] as SkillKind[]).map((k) => {
                    const cfg = kindConfig[k]
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setKind(k)}
                        className="py-2 rounded-lg border text-sm transition-colors"
                        style={
                          kind === k
                            ? { borderColor: cfg.color, color: cfg.color, background: cfg.bg }
                            : { borderColor: '#e8e6dc', color: '#5e5d59', background: '#ffffff' }
                        }
                      >
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 协议 JSON 编辑器 */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#141413' }}>
                  协议 JSON
                </label>
                <textarea
                  value={protocolJson}
                  onChange={(e) => setProtocolJson(e.target.value)}
                  rows={6}
                  spellCheck={false}
                  className="w-full px-3 py-2 rounded-lg border text-xs font-mono outline-none focus:border-[#c96442] transition-colors resize-none"
                  style={{ background: '#1a1a1a', color: '#f8f8f2', borderColor: '#e8e6dc' }}
                />
              </div>

              {error && (
                <div className="text-sm px-3 py-2 rounded-lg mb-4" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626' }}>
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors hover:bg-[#f5f4ed]"
                  style={{ borderColor: '#e8e6dc', color: '#5e5d59' }}
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-opacity disabled:opacity-60"
                  style={{ background: '#c96442' }}
                >
                  {submitting ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================
// 调用历史 Modal
// ============================================================
function LogsModal({ skill, onClose }: { skill: Skill | null; onClose: () => void }) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (skill) {
      setLoading(true)
      fetch(`${API_BASE}/skills/${skill.id}/logs`, {
        headers: { 'x-user-id': localStorage.getItem('talentx_user_id') || '' },
      })
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((data) => setLogs(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []))
        .catch(() => setLogs([]))
        .finally(() => setLoading(false))
    }
  }, [skill])

  return (
    <AnimatePresence>
      {skill && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(20,20,19,0.4)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="rounded-2xl border w-full max-w-lg max-h-[80vh] overflow-y-auto"
            style={{ background: '#faf9f5', borderColor: '#e8e6dc' }}
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-semibold" style={{ color: '#141413', fontFamily: "'Playfair Display', serif" }}>
                  调用历史 — {skill.title}
                </h2>
                <button onClick={onClose} className="text-[#87867f] hover:text-[#141413]">
                  <X size={20} />
                </button>
              </div>
              {loading ? (
                <p className="text-sm text-[#87867f] text-center py-8">加载中...</p>
              ) : logs.length === 0 ? (
                <p className="text-sm text-[#87867f] text-center py-8">暂无调用记录</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, i) => (
                    <div key={log.id || i} className="p-3 rounded-lg border" style={{ background: '#ffffff', borderColor: '#e8e6dc' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium" style={{ color: '#141413' }}>
                          {log.caller_label || log.caller || '匿名调用方'}
                        </span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={
                            log.status === 'success'
                              ? { color: '#4a8c6f', background: 'rgba(74,140,111,0.12)' }
                              : { color: '#dc2626', background: 'rgba(220,38,38,0.12)' }
                          }
                        >
                          {log.status === 'success' ? '成功' : '失败'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#87867f]">
                        {log.created_at ? new Date(log.created_at).toLocaleString('zh-CN') : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================
// Skill 调用测试器 Modal
// ============================================================
function SkillTester({ skill, onClose }: { skill: Skill | null; onClose: () => void }) {
  const [testInput, setTestInput] = useState('{}')
  const [testResult, setTestResult] = useState<any>(null)
  const [testing, setTesting] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)

  // 初始化输入（根据 input schema 生成占位 JSON）
  useEffect(() => {
    if (skill) {
      setTestResult(null)
      setTestError(null)
      try {
        const protocol = skill.protocol || {}
        const inputSchema = protocol.input || {}
        // 生成示例输入
        const sample: Record<string, any> = {}
        if (inputSchema.properties && typeof inputSchema.properties === 'object') {
          for (const [k, v] of Object.entries(inputSchema.properties)) {
            const type = (v as any)?.type
            sample[k] = type === 'number' ? 0 : type === 'boolean' ? false : type === 'array' ? [] : type === 'object' ? {} : ''
          }
        } else if (typeof inputSchema === 'object') {
          for (const [k, v] of Object.entries(inputSchema)) {
            sample[k] = typeof v === 'string' ? '' : v
          }
        }
        setTestInput(JSON.stringify(sample, null, 2))
      } catch {
        setTestInput('{}')
      }
    }
  }, [skill])

  // 测试调用
  const handleTest = async () => {
    if (!skill) return
    // 校验 JSON
    let inputObj: any
    try {
      inputObj = JSON.parse(testInput)
    } catch (err) {
      setTestError('输入 JSON 格式错误：' + (err as Error).message)
      return
    }
    setTesting(true)
    setTestError(null)
    setTestResult(null)
    try {
      const res = await fetch(`${API_BASE}/skills/${skill.id}/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: inputObj, callerLabel: 'studio-tester' }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || `调用失败 (${res.status})`)
      }
      setTestResult(data?.data || data)
    } catch (err: any) {
      setTestError(err.message || '调用失败')
    } finally {
      setTesting(false)
    }
  }

  return (
    <AnimatePresence>
      {skill && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(20,20,19,0.4)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="rounded-2xl border w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{ background: '#faf9f5', borderColor: '#e8e6dc' }}
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-semibold" style={{ color: '#141413', fontFamily: "'Playfair Display', serif" }}>
                    测试调用
                  </h2>
                  <p className="text-xs text-[#87867f] mt-0.5">{skill.title}</p>
                </div>
                <button onClick={onClose} className="text-[#87867f] hover:text-[#141413]">
                  <X size={20} />
                </button>
              </div>

              {/* Input Schema 展示 */}
              <div className="mb-4">
                <label className="block text-xs font-medium mb-1.5 text-[#87867f]">Input Schema</label>
                <pre
                  className="text-[11px] font-mono p-3 rounded-lg overflow-x-auto"
                  style={{ background: '#1a1a1a', color: '#f8f8f2' }}
                >
                  {JSON.stringify(skill.protocol?.input || {}, null, 2)}
                </pre>
              </div>

              {/* 输入参数 */}
              <div className="mb-4">
                <label className="block text-xs font-medium mb-1.5 text-[#87867f]">输入参数 (JSON)</label>
                <textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  rows={6}
                  spellCheck={false}
                  className="w-full px-3 py-2 rounded-lg border text-xs font-mono outline-none focus:border-[#c96442] transition-colors resize-none"
                  style={{ background: '#1a1a1a', color: '#f8f8f2', borderColor: '#e8e6dc' }}
                />
              </div>

              {/* 测试按钮 */}
              <div className="mb-4">
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity disabled:opacity-60"
                  style={{ background: '#c96442' }}
                >
                  <Zap size={14} />
                  {testing ? '调用中...' : '测试调用'}
                </button>
              </div>

              {/* 错误提示 */}
              {testError && (
                <div className="text-sm px-3 py-2 rounded-lg mb-4" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626' }}>
                  {testError}
                </div>
              )}

              {/* 返回结果 */}
              {testResult !== null && (
                <div className="mb-2">
                  <label className="block text-xs font-medium mb-1.5 text-[#87867f]">返回结果</label>
                  <pre
                    className="text-[11px] font-mono p-3 rounded-lg overflow-x-auto"
                    style={{ background: '#1a1a1a', color: '#f8f8f2' }}
                  >
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================
// MCP 接入信息面板
// ============================================================

// 支持的 MCP tools 列表
const MCP_TOOLS = [
  { name: 'get_user_profile', desc: '获取用户能力画像与认证信息' },
  { name: 'verify_certificate', desc: '验证用户的认证证书' },
  { name: 'search_talents', desc: '搜索符合条件的人才' },
  { name: 'invoke_skill', desc: '调用用户发布的 Skill' },
  { name: 'get_leaderboard', desc: '获取能力排行榜' },
]

// 配置 JSON 示例
const MCP_CONFIG_JSON = `{
  "mcpServers": {
    "talentx": {
      "url": "https://your-talentx-domain.com/api/mcp",
      "transport": "http"
    }
  }
}`

function McpDocsPanel() {
  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: '#141413', fontFamily: "'Playfair Display', serif" }}>
          MCP 接入信息
        </h2>
        <p className="text-sm text-[#5e5d59]">
          将 TalentX 的能力验证体系接入你的 AI 工具，让 Agent 直接调用经过验证的真实能力
        </p>
      </div>

      {/* MCP Server 地址 */}
      <div className="rounded-xl border p-5" style={{ background: '#ffffff', borderColor: '#e8e6dc' }}>
        <div className="flex items-center gap-2 mb-3">
          <Terminal size={18} style={{ color: '#c96442' }} />
          <h3 className="text-base font-semibold" style={{ color: '#141413' }}>MCP Server 地址</h3>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: '#f5f4ed' }}>
          <code className="text-sm font-mono flex-1" style={{ color: '#141413' }}>/api/mcp</code>
          <CopyButton text="/api/mcp" />
        </div>
      </div>

      {/* 支持的 tools 列表 */}
      <div className="rounded-xl border p-5" style={{ background: '#ffffff', borderColor: '#e8e6dc' }}>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={18} style={{ color: '#c96442' }} />
          <h3 className="text-base font-semibold" style={{ color: '#141413' }}>支持的 Tools</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {MCP_TOOLS.map((tool) => (
            <div key={tool.name} className="flex items-start gap-2 p-3 rounded-lg border" style={{ borderColor: '#e8e6dc' }}>
              <Zap size={14} className="mt-0.5 shrink-0" style={{ color: '#c96442' }} />
              <div className="min-w-0">
                <code className="text-xs font-mono font-medium" style={{ color: '#141413' }}>{tool.name}</code>
                <p className="text-[11px] text-[#5e5d59] mt-0.5 leading-relaxed">{tool.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Claude Desktop 配置 */}
      <div className="rounded-xl border p-5" style={{ background: '#ffffff', borderColor: '#e8e6dc' }}>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={18} style={{ color: '#6366f1' }} />
          <h3 className="text-base font-semibold" style={{ color: '#141413' }}>在 Claude Desktop 中配置</h3>
        </div>
        <ol className="text-sm text-[#5e5d59] space-y-1.5 mb-4 list-decimal pl-5 leading-relaxed">
          <li>打开 Claude Desktop 设置</li>
          <li>进入「Developer」→「Edit Config」</li>
          <li>将下方 JSON 配置粘贴到 <code className="text-xs font-mono" style={{ color: '#c96442' }}>mcpServers</code> 中</li>
          <li>重启 Claude Desktop 即可使用</li>
        </ol>
      </div>

      {/* Cursor 配置 */}
      <div className="rounded-xl border p-5" style={{ background: '#ffffff', borderColor: '#e8e6dc' }}>
        <div className="flex items-center gap-2 mb-3">
          <Code2 size={18} style={{ color: '#06b6d4' }} />
          <h3 className="text-base font-semibold" style={{ color: '#141413' }}>在 Cursor 中配置</h3>
        </div>
        <ol className="text-sm text-[#5e5d59] space-y-1.5 list-decimal pl-5 leading-relaxed">
          <li>打开 Cursor Settings →「MCP」</li>
          <li>点击「Add new MCP Server」</li>
          <li>选择 transport 类型为 <code className="text-xs font-mono" style={{ color: '#c96442' }}>http</code></li>
          <li>填入 TalentX MCP Server 地址，保存即可</li>
        </ol>
      </div>

      {/* 配置 JSON 示例 */}
      <div className="rounded-xl border p-5" style={{ background: '#ffffff', borderColor: '#e8e6dc' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Code2 size={18} style={{ color: '#c96442' }} />
            <h3 className="text-base font-semibold" style={{ color: '#141413' }}>配置 JSON 示例</h3>
          </div>
          <CopyButton text={MCP_CONFIG_JSON} label="复制" />
        </div>
        <pre
          className="text-xs font-mono p-4 rounded-lg overflow-x-auto"
          style={{ background: '#1a1a1a', color: '#f8f8f2' }}
        >
          {MCP_CONFIG_JSON}
        </pre>
      </div>
    </div>
  )
}

// ============================================================
// 主页面组件
// ============================================================
export default function SkillStudio() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'my-skills' | 'create' | 'mcp-docs'>('my-skills')
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [logsSkill, setLogsSkill] = useState<Skill | null>(null)
  const [testingSkill, setTestingSkill] = useState<Skill | null>(null)

  // 当前用户 ID（与项目既有模式一致，使用 localStorage + authStore）
  const getUserId = useCallback((): string => {
    return user?.id || localStorage.getItem('talentx_user_id') || ''
  }, [user])

  // 获取 skills 列表
  const loadSkills = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/skills`, {
        headers: { 'x-user-id': getUserId() },
      })
      if (!res.ok) throw new Error(`获取失败 (${res.status})`)
      const data = await res.json()
      // API 返回 { success, data } 结构
      const list = Array.isArray(data) ? data : (data?.data ?? [])
      // 兼容字段：API 返回 invoke_count，前端 interface 也支持 invocation_count
      setSkills(list)
    } catch (e) {
      setError((e as Error).message)
      setSkills([])
    } finally {
      setLoading(false)
    }
  }, [getUserId])

  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  // 创建 skill
  const handleCreate = async (formData: {
    title: string
    description: string
    kind: SkillKind
    protocol: any
  }) => {
    const res = await fetch(`${API_BASE}/skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': getUserId() },
      body: JSON.stringify(formData),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `创建失败 (${res.status})` }))
      throw new Error(err.error || '创建失败')
    }
    await loadSkills()
    setActiveTab('my-skills')
  }

  // 更新 skill（编辑）
  const handleEditSubmit = async (data: Partial<Skill>) => {
    const res = await fetch(`${API_BASE}/skills/${data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-id': getUserId() },
      body: JSON.stringify({
        title: data.title,
        description: data.description,
        kind: data.kind,
        protocol: data.protocol,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: '保存失败' }))
      throw new Error(err.error || '保存失败')
    }
    await loadSkills()
  }

  // 发布/取消发布
  const handlePublish = async (s: Skill) => {
    const isPublished = s.status === 'published' || s.status === 'verified'
    try {
      if (isPublished) {
        // 撤销发布：PUT 更新状态为 draft
        const res = await fetch(`${API_BASE}/skills/${s.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-user-id': getUserId() },
          body: JSON.stringify({ status: 'draft' }),
        })
        if (!res.ok) throw new Error('撤销失败')
      } else {
        // 发布
        const res = await fetch(`${API_BASE}/skills/${s.id}/publish`, {
          method: 'POST',
          headers: { 'x-user-id': getUserId() },
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: '发布失败' }))
          throw new Error(err.error || '发布失败')
        }
      }
      await loadSkills()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // 删除 skill
  const handleDelete = async (s: Skill) => {
    if (!confirm(`确定要删除 Skill「${s.title}」吗？此操作不可恢复。`)) return
    try {
      const res = await fetch(`${API_BASE}/skills/${s.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': getUserId() },
      })
      if (!res.ok) throw new Error('删除失败')
      await loadSkills()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // Tab 配置
  const tabs: Array<{ key: typeof activeTab; label: string; icon: typeof Code2 }> = [
    { key: 'my-skills', label: '我的 Skills', icon: Layers },
    { key: 'create', label: '创建新 Skill', icon: Plus },
    { key: 'mcp-docs', label: 'MCP 接入', icon: Terminal },
  ]

  return (
    <div className="min-h-screen pb-16" style={{ background: '#faf9f5' }}>
      {/* 顶部导航 */}
      <nav className="border-b border-[#e8e6dc] sticky top-0 z-30" style={{ background: 'rgba(250,249,245,0.9)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="text-lg font-bold"
            style={{ color: '#141413', fontFamily: "'Playfair Display', serif" }}
          >
            TalentX
          </Link>
          <div className="flex items-center gap-4 text-sm" style={{ color: '#5e5d59' }}>
            <Link to="/trials" className="hover:opacity-70 transition-opacity">试炼大厅</Link>
            <Link to="/leaderboard" className="hover:opacity-70 transition-opacity">排行榜</Link>
            <span className="font-medium" style={{ color: '#c96442' }}>Skill Studio</span>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(201,100,66,0.1)' }}
            >
              <Code2 size={22} style={{ color: '#c96442' }} />
            </div>
            <h1
              className="text-3xl font-bold"
              style={{ color: '#141413', fontFamily: "'Playfair Display', serif" }}
            >
              Skill Studio
            </h1>
          </div>
          <p className="text-sm text-[#5e5d59] max-w-xl leading-relaxed">
            创建、管理和发布你的可调用 Skill — 让能力从「被评估」零切换为「被使用」
          </p>
        </motion.div>

        {/* Tab 导航 */}
        <div
          className="flex gap-1 mb-8 p-1 rounded-xl inline-flex"
          style={{ background: '#e8e6dc' }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: active ? '#ffffff' : 'transparent',
                  color: active ? '#141413' : '#5e5d59',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* 错误提示（全局） */}
        {error && activeTab === 'my-skills' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm px-4 py-3 rounded-lg mb-6"
            style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626' }}
          >
            {error}
          </motion.div>
        )}

        {/* Tab 内容 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* 我的 Skills Tab */}
            {activeTab === 'my-skills' && (
              <>
                {/* 顶部操作栏 */}
                <div className="flex items-center justify-between mb-6">
                  <p className="text-sm text-[#5e5d59]">
                    共 <span className="font-semibold" style={{ color: '#141413' }}>{skills.length}</span> 个 Skill
                  </p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
                    style={{ background: '#c96442' }}
                  >
                    <Plus size={16} />
                    创建 Skill
                  </button>
                </div>

                {/* 加载状态 */}
                {loading && (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-3 border-[#e8e6dc] border-t-[#c96442] rounded-full animate-spin" />
                  </div>
                )}

                {/* 空状态 */}
                {!loading && skills.length === 0 && (
                  <div className="text-center py-20">
                    <div
                      className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                      style={{ background: 'rgba(201,100,66,0.08)' }}
                    >
                      <Layers size={28} style={{ color: '#c96442' }} />
                    </div>
                    <p className="text-[#5e5d59] mb-1">还没有 Skill</p>
                    <p className="text-xs text-[#87867f] mb-5">创建你的第一个可调用 Skill，让能力被直接使用</p>
                    <button
                      onClick={() => setActiveTab('create')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
                      style={{ background: '#c96442' }}
                    >
                      <Plus size={16} />
                      创建 Skill
                    </button>
                  </div>
                )}

                {/* Skills 网格 */}
                {!loading && skills.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {skills.map((skill) => (
                        <SkillCard
                          key={skill.id}
                          skill={skill}
                          onEdit={(s) => setEditingSkill(s)}
                          onPublish={handlePublish}
                          onDelete={handleDelete}
                          onViewLogs={(s) => setLogsSkill(s)}
                          onTest={(s) => setTestingSkill(s)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}

            {/* 创建新 Skill Tab */}
            {activeTab === 'create' && (
              <div className="max-w-2xl">
                <CreateSkillForm
                  onSubmit={handleCreate}
                  onDone={() => setActiveTab('my-skills')}
                />
              </div>
            )}

            {/* MCP 文档 Tab */}
            {activeTab === 'mcp-docs' && <McpDocsPanel />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 编辑 Modal */}
      <EditSkillModal
        skill={editingSkill}
        onClose={() => setEditingSkill(null)}
        onSubmit={handleEditSubmit}
      />

      {/* 调用历史 Modal */}
      <LogsModal skill={logsSkill} onClose={() => setLogsSkill(null)} />

      {/* 测试调用 Modal */}
      <SkillTester skill={testingSkill} onClose={() => setTestingSkill(null)} />
    </div>
  )
}
