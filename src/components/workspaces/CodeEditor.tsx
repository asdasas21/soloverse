import { useState } from 'react'
import { ChevronRight, Code2, Check } from 'lucide-react'
import type { CodeEditConfig } from '@/data/scenarioEngine'

/**
 * 代码编辑器 — 用户实际写代码
 * 不是对话：是真正的编码行为，AI 看的是代码本身
 */
export default function CodeEditor({
  config,
  onSubmit,
}: {
  config: CodeEditConfig
  onSubmit: (code: string) => void
}) {
  const [code, setCode] = useState(config.starterCode)

  return (
    <div className="max-w-3xl mx-auto">
      {/* 任务要求 */}
      <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(74,140,111,0.05)', border: '1px solid rgba(74,140,111,0.15)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Code2 size={14} style={{ color: '#4a8c6f' }} />
          <span className="text-xs font-semibold" style={{ color: '#4a8c6f' }}>编码任务</span>
        </div>
        <div className="space-y-1">
          {config.requirements.map((req, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[10px] mt-1 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(74,140,111,0.15)', color: '#4a8c6f' }}>
                {i + 1}
              </span>
              <span className="text-xs" style={{ color: '#5e5d59' }}>{req}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 编辑器 */}
      <div className="rounded-xl overflow-hidden mb-4" style={{ border: '1px solid rgba(232,230,220,0.8)' }}>
        <div className="px-4 py-2 flex items-center justify-between" style={{ background: '#1a1a2e' }}>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: '#ff5f56' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: '#ffbd2e' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: '#27c93f' }} />
            </div>
            <span className="text-xs font-mono ml-2" style={{ color: '#87867f' }}>{config.language}</span>
          </div>
          <span className="text-[10px]" style={{ color: '#4a4a5e' }}>{code.split('\n').length} 行</span>
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="w-full p-4 font-mono text-xs leading-relaxed outline-none resize-none"
          style={{
            background: '#1a1a2e',
            color: '#e0e0e0',
            minHeight: '300px',
            caretColor: '#c96442',
            tabSize: 2,
          }}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault()
              const start = e.currentTarget.selectionStart
              const end = e.currentTarget.selectionEnd
              const newCode = code.substring(0, start) + '  ' + code.substring(end)
              setCode(newCode)
              e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2
            }
          }}
        />
      </div>

      {/* 提交 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Check size={14} style={{ color: code.trim() !== config.starterCode.trim() ? '#4a8c6f' : '#c4c3bd' }} />
          <span className="text-[10px]" style={{ color: '#87867f' }}>
            {code.trim() !== config.starterCode.trim() ? '已修改代码' : '等待编辑'}
          </span>
        </div>
        <button
          onClick={() => onSubmit(code)}
          disabled={code.trim() === config.starterCode.trim()}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 flex items-center gap-2"
          style={{ background: code.trim() !== config.starterCode.trim() ? 'linear-gradient(135deg, #c96442, #d97757)' : '#c4c3bd' }}
        >
          提交代码 <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
