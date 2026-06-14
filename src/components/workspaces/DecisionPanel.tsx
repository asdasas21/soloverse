import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react'
import type { DecisionConfig, DecisionOption } from '@/data/scenarioEngine'

/**
 * 决策面板 — 用户面对复杂场景做选择
 * 不是对话：是真实的工程决策，每个选择有后果
 */
export default function DecisionPanel({
  config,
  onSubmit,
}: {
  config: DecisionConfig
  onSubmit: (optionId: string, option: DecisionOption) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const handleConfirm = () => {
    if (!selected) return
    const option = config.options.find((o) => o.id === selected)
    if (option) {
      setConfirmed(true)
      setTimeout(() => onSubmit(selected, option), 1500)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* 场景描述 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl p-5 mb-6"
        style={{ background: 'rgba(201,100,66,0.05)', border: '1px solid rgba(201,100,66,0.15)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={16} style={{ color: '#c96442' }} />
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#c96442' }}>
            场景决策
          </span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: '#141413' }}>
          {config.scenario}
        </p>
      </motion.div>

      {/* 选项列表 */}
      <div className="space-y-3">
        {config.options.map((option, i) => (
          <motion.button
            key={option.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => !confirmed && setSelected(option.id)}
            disabled={confirmed}
            className="w-full text-left rounded-xl p-4 transition-all"
            style={{
              background: selected === option.id ? 'rgba(201,100,66,0.08)' : 'rgba(255,255,255,0.6)',
              border: `1.5px solid ${
                selected === option.id ? '#c96442' : confirmed ? 'rgba(232,230,220,0.6)' : 'rgba(232,230,220,0.8)'
              }`,
              cursor: confirmed ? 'default' : 'pointer',
              opacity: confirmed && selected !== option.id ? 0.4 : 1,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{
                  borderColor: selected === option.id ? '#c96442' : '#c4c3bd',
                  background: selected === option.id ? '#c96442' : 'transparent',
                }}
              >
                {selected === option.id && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <CheckCircle2 size={12} className="text-white" />
                  </motion.div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: '#141413' }}>
                  {option.label}
                </p>
                <AnimatePresence>
                  {confirmed && selected === option.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2 pt-2 border-t"
                      style={{ borderColor: 'rgba(201,100,66,0.15)' }}
                    >
                      <p className="text-xs leading-relaxed" style={{ color: '#87867f' }}>
                        <span className="font-medium" style={{ color: '#c96442' }}>后果：</span>
                        {option.consequence}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* 确认按钮 */}
      <AnimatePresence>
        {selected && !confirmed && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onClick={handleConfirm}
            className="w-full mt-5 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #c96442, #d97757)' }}
          >
            确认决策 <ChevronRight size={16} />
          </motion.button>
        )}
      </AnimatePresence>

      {confirmed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mt-5 text-xs"
          style={{ color: '#87867f' }}
        >
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            AI 正在分析你的决策...
          </motion.span>
        </motion.div>
      )}
    </div>
  )
}
