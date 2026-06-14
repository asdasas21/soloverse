import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { ChevronRight, Clock, Megaphone } from 'lucide-react'
import type { PitchConfig } from '@/data/scenarioEngine'

/**
 * 路演构建器 — 结构化填空，限时提交
 * 不是对话：是实际的路演内容构建
 */
export default function PitchBuilder({
  config,
  onSubmit,
}: {
  config: PitchConfig
  onSubmit: (sections: Record<string, string>) => void
}) {
  const [sections, setSections] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState(config.timeLimit || 0)

  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length
  const allValid = config.sections.every((s) => wordCount(sections[s.id] || '') >= s.minWords)
  const timeUp = timeLeft === 0 && (config.timeLimit || 0) > 0

  return (
    <div className="max-w-2xl mx-auto">
      {/* 限时提示 */}
      {(config.timeLimit || 0) > 0 && (
        <motion.div
          animate={{
            background: timeLeft < 60 ? 'rgba(220,38,38,0.08)' : 'rgba(201,100,66,0.05)',
          }}
          className="rounded-xl p-3 mb-4 flex items-center justify-between"
          style={{ border: '1px solid rgba(201,100,66,0.15)' }}
        >
          <div className="flex items-center gap-2">
            <Megaphone size={16} style={{ color: timeLeft < 60 ? '#dc2626' : '#c96442' }} />
            <span className="text-xs font-semibold" style={{ color: '#141413' }}>项目路演</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={14} style={{ color: timeLeft < 60 ? '#dc2626' : '#c96442' }} />
            <span className="text-sm font-mono font-bold" style={{ color: timeLeft < 60 ? '#dc2626' : '#c96442' }}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </motion.div>
      )}

      {/* 路演结构 */}
      <div className="space-y-4">
        {config.sections.map((section, i) => {
          const value = sections[section.id] || ''
          const words = wordCount(value)
          const isValid = words >= section.minWords
          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl p-4"
              style={{
                background: 'rgba(255,255,255,0.6)',
                border: `1px solid ${isValid ? 'rgba(74,140,111,0.3)' : 'rgba(232,230,220,0.8)'}`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#c96442', color: '#fff' }}>
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: '#141413' }}>{section.title}</span>
                </div>
                <span className="text-[10px]" style={{ color: isValid ? '#4a8c6f' : '#87867f' }}>
                  {words}/{section.minWords} 字
                </span>
              </div>
              <p className="text-[10px] mb-2" style={{ color: '#c4c3bd' }}>评估标准：{section.criteria}</p>
              <textarea
                value={value}
                onChange={(e) => setSections({ ...sections, [section.id]: e.target.value })}
                placeholder={section.placeholder}
                rows={3}
                disabled={timeUp}
                className="w-full bg-transparent px-3 py-2 text-sm rounded-lg outline-none resize-none disabled:opacity-50"
                style={{ border: '1px solid rgba(232,230,220,0.6)', color: '#141413' }}
              />
            </motion.div>
          )
        })}
      </div>

      {/* 提交 */}
      <button
        onClick={() => onSubmit(sections)}
        disabled={!allValid && !timeUp}
        className="w-full mt-5 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
        style={{ background: allValid || timeUp ? 'linear-gradient(135deg, #c96442, #d97757)' : '#c4c3bd' }}
      >
        {timeUp ? '时间到，提交当前内容' : '提交路演'} <ChevronRight size={16} />
      </button>
    </div>
  )
}
