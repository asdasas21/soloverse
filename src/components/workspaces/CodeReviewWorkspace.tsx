import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Flag, ChevronRight, AlertCircle } from 'lucide-react'
import type { CodeReviewConfig, CodeIssue } from '@/data/scenarioEngine'

interface UserFinding {
  line: number
  severity: CodeIssue['severity']
  comment: string
}

/**
 * 代码审查台 — 用户审查真实代码，标注问题行
 * 不是对话：是实际逐行审查，选择问题严重级别
 */
export default function CodeReviewWorkspace({
  config,
  onSubmit,
}: {
  config: CodeReviewConfig
  onSubmit: (findings: UserFinding[]) => void
}) {
  const lines = config.code.split('\n')
  const [findings, setFindings] = useState<UserFinding[]>([])
  const [selectedLine, setSelectedLine] = useState<number | null>(null)
  const [severity, setSeverity] = useState<CodeIssue['severity']>('warning')
  const [comment, setComment] = useState('')

  const toggleLine = (lineNum: number) => {
    const existing = findings.find((f) => f.line === lineNum)
    if (existing) {
      setFindings(findings.filter((f) => f.line !== lineNum))
    } else {
      setSelectedLine(lineNum)
    }
  }

  const addFinding = () => {
    if (selectedLine === null || !comment.trim()) return
    setFindings([...findings, { line: selectedLine, severity, comment: comment.trim() }])
    setSelectedLine(null)
    setComment('')
    setSeverity('warning')
  }

  const severityColors: Record<string, { bg: string; text: string; label: string }> = {
    critical: { bg: 'rgba(220,38,38,0.08)', text: '#dc2626', label: '严重' },
    warning: { bg: 'rgba(217,119,6,0.08)', text: '#d97706', label: '警告' },
    style: { bg: 'rgba(99,102,241,0.08)', text: '#6366f1', label: '建议' },
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* 上下文 */}
      <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(74,140,111,0.05)', border: '1px solid rgba(74,140,111,0.15)' }}>
        <p className="text-xs leading-relaxed" style={{ color: '#5e5d59' }}>
          <span className="font-semibold" style={{ color: '#4a8c6f' }}>上下文：</span>
          {config.context}
        </p>
      </div>

      {/* 代码区域 */}
      <div className="rounded-xl overflow-hidden mb-4" style={{ border: '1px solid rgba(232,230,220,0.8)' }}>
        <div className="px-4 py-2 flex items-center justify-between" style={{ background: '#1a1a2e' }}>
          <span className="text-xs font-mono" style={{ color: '#87867f' }}>{config.language}</span>
          <span className="text-xs" style={{ color: '#87867f' }}>点击行号标注问题</span>
        </div>
        <div className="overflow-x-auto" style={{ background: '#1a1a2e' }}>
          <pre className="text-xs font-mono leading-relaxed p-4 min-w-fit">
            {lines.map((line, i) => {
              const lineNum = i + 1
              const finding = findings.find((f) => f.line === lineNum)
              const isSelected = selectedLine === lineNum
              const sevColor = finding ? severityColors[finding.severity] : null
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 cursor-pointer transition-colors rounded px-1"
                  style={{
                    background: isSelected ? 'rgba(201,100,66,0.15)' : sevColor ? sevColor.bg : 'transparent',
                  }}
                  onClick={() => toggleLine(lineNum)}
                >
                  <span className="text-[10px] mt-0.5 select-none w-6 text-right" style={{ color: '#4a4a5e' }}>
                    {lineNum}
                  </span>
                  <span className="flex-1" style={{ color: '#e0e0e0' }}>
                    {finding && <Flag size={10} className="inline mr-1" style={{ color: sevColor?.text }} />}
                    {line}
                  </span>
                </div>
              )
            })}
          </pre>
        </div>
      </div>

      {/* 标注弹窗 */}
      <AnimatePresence>
        {selectedLine !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-4 mb-4"
            style={{ background: 'rgba(255,255,255,0.8)', border: '1.5px solid #c96442' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={14} style={{ color: '#c96442' }} />
              <span className="text-xs font-semibold" style={{ color: '#c96442' }}>
                标注第 {selectedLine} 行的问题
              </span>
            </div>
            <div className="flex gap-2 mb-3">
              {(['critical', 'warning', 'style'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSeverity(s)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: severity === s ? severityColors[s].text : 'transparent',
                    color: severity === s ? '#fff' : severityColors[s].text,
                    border: `1px solid ${severityColors[s].text}`,
                  }}
                >
                  {severityColors[s].label}
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="描述这个问题..."
              rows={2}
              className="w-full bg-transparent px-3 py-2 text-sm rounded-lg outline-none resize-none mb-3"
              style={{ border: '1px solid rgba(232,230,220,0.8)', color: '#141413' }}
            />
            <div className="flex gap-2">
              <button
                onClick={addFinding}
                disabled={!comment.trim()}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
                style={{ background: '#c96442' }}
              >
                添加标注
              </button>
              <button
                onClick={() => setSelectedLine(null)}
                className="px-4 py-2 rounded-lg text-xs"
                style={{ color: '#87867f' }}
              >
                取消
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 已标注的问题列表 */}
      {findings.length > 0 && (
        <div className="space-y-2 mb-4">
          <span className="text-xs font-semibold" style={{ color: '#5e5d59' }}>
            已发现 {findings.length} 个问题
          </span>
          {findings.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-lg p-3 flex items-start gap-2"
              style={{ background: severityColors[f.severity].bg, border: `1px solid ${severityColors[f.severity].text}30` }}
            >
              <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: severityColors[f.severity].text, color: '#fff' }}>
                L{f.line}
              </span>
              <div className="flex-1">
                <span className="text-xs font-medium" style={{ color: severityColors[f.severity].text }}>
                  {severityColors[f.severity].label}
                </span>
                <p className="text-xs mt-0.5" style={{ color: '#5e5d59' }}>{f.comment}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 提交按钮 */}
      <button
        onClick={() => onSubmit(findings)}
        disabled={findings.length === 0}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
        style={{ background: findings.length > 0 ? 'linear-gradient(135deg, #c96442, #d97757)' : '#c4c3bd' }}
      >
        提交审查报告 ({findings.length} 项发现) <ChevronRight size={16} />
      </button>
    </div>
  )
}
