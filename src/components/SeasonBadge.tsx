import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Calendar, RefreshCw, AlertTriangle } from 'lucide-react'
import { fetchAPI } from '@/api/client'

// 赛季数据接口
interface SeasonData {
  id: string
  name: string
  startDate: string
  endDate: string
  daysRemaining: number
  progress: number
  totalDays: number
  elapsedDays: number
}

// 能力保鲜度接口
interface Freshness {
  score: number
  label: string
  color: string
}

interface SeasonBadgeProps {
  freshness?: Freshness
}

// 圆环保鲜度指示器（SVG）
function FreshnessRing({ freshness }: { freshness: Freshness }) {
  const size = 36
  const stroke = 4
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (freshness.score / 100) * circumference

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border, rgba(255,255,255,0.1))"
          strokeWidth={stroke}
        />
        {/* 进度圆环 */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={freshness.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          color: freshness.color,
        }}
      >
        {freshness.score}
      </span>
    </div>
  )
}

export default function SeasonBadge({ freshness }: SeasonBadgeProps) {
  const [season, setSeason] = useState<SeasonData | null>(null)

  useEffect(() => {
    let mounted = true
    fetchAPI<{ success: boolean; data: SeasonData }>('/season/current')
      .then((res) => {
        if (mounted && res?.data) setSeason(res.data)
      })
      .catch((err) => console.error('[SeasonBadge] 获取赛季信息失败:', err))
    return () => {
      mounted = false
    }
  }, [])

  // 保鲜度低时显示提醒
  const showRefreshAlert = freshness != null && freshness.score < 60

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: 16,
        borderRadius: 12,
        border: '1px solid var(--color-border, rgba(255,255,255,0.08))',
        background: 'var(--color-card, rgba(255,255,255,0.03))',
      }}
    >
      {/* 左侧：赛季信息 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Calendar size={14} style={{ color: 'var(--color-accent, #c96442)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text, #fff)' }}>
            {season?.name ?? '加载中…'}
          </span>
        </div>

        {/* 赛季进度条 */}
        <div
          style={{
            position: 'relative',
            height: 4,
            borderRadius: 2,
            background: 'var(--color-border, rgba(255,255,255,0.08))',
            overflow: 'hidden',
            marginBottom: 6,
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${season?.progress ?? 0}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              height: '100%',
              borderRadius: 2,
              background: 'linear-gradient(90deg, #c96442, #f59e0b)',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted, #87867f)' }}>
          <span>已进行 {season?.elapsedDays ?? 0} 天</span>
          <span>剩余 {season?.daysRemaining ?? 0} 天</span>
        </div>

        {/* 保鲜度过低提醒 */}
        {showRefreshAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 8,
              fontSize: 11,
              color: '#f59e0b',
            }}
          >
            <AlertTriangle size={12} />
            <span>能力保鲜度较低，建议重新试炼</span>
          </motion.div>
        )}
      </div>

      {/* 右侧：能力保鲜度 */}
      {freshness && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <FreshnessRing freshness={freshness} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <RefreshCw size={10} style={{ color: freshness.color }} />
            <span style={{ fontSize: 11, color: freshness.color, fontWeight: 600 }}>
              {freshness.label}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  )
}
