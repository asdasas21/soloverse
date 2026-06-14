import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  Users,
  Star,
  Clock,
  CheckCircle,
  ArrowRight,
  Award,
} from 'lucide-react';

interface PeerReviewProps {
  certScore: number;
  userId: string;
}

// 盲评资格门槛
const ELIGIBLE_SCORE = 70;

// 双重认证流程步骤
const REVIEW_STEPS = [
  { icon: ShieldCheck, label: '提交申请' },
  { icon: Users, label: '随机匹配 3 位评审者' },
  { icon: Star, label: '盲评打分' },
  { icon: Award, label: '获得双重认证徽章' },
];

// 活跃评审者排行榜（mock 数据）
const TOP_REVIEWERS = [
  { name: 'Alex Chen', reviews: 47, accuracy: 94, badge: '金牌评审' },
  { name: '林晓雯', reviews: 32, accuracy: 91, badge: '银牌评审' },
  { name: 'Marcus L.', reviews: 28, accuracy: 89, badge: '银牌评审' },
];

// 评审者徽章对应的配色
const BADGE_STYLES: Record<string, { color: string; bg: string }> = {
  金牌评审: { color: '#b8860b', bg: 'rgba(251,191,36,0.15)' },
  银牌评审: { color: '#6b7280', bg: 'rgba(156,163,175,0.15)' },
};

export default function PeerReview({ certScore, userId }: PeerReviewProps) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'completed'>('idle');

  // 从 localStorage 读取已保存的状态
  useEffect(() => {
    const saved = localStorage.getItem(`peerReview-${userId}`);
    if (saved) setStatus(saved as 'idle' | 'pending' | 'completed');
  }, [userId]);

  // 点击申请：进入 pending，5 秒后模拟完成
  const handleApply = () => {
    setStatus('pending');
    localStorage.setItem(`peerReview-${userId}`, 'pending');
    setTimeout(() => {
      setStatus('completed');
      localStorage.setItem(`peerReview-${userId}`, 'completed');
    }, 5000); // 5 秒模拟（实际应为 24h）
  };

  // 是否有资格
  const eligible = certScore >= ELIGIBLE_SCORE;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="rounded-xl p-5 border w-full"
      style={{
        background: 'var(--color-card)',
        borderColor: 'var(--color-border)',
        maxWidth: 500,
      }}
    >
      {/* 标题 */}
      <h2
        className="text-lg font-bold mb-4 flex items-center gap-2"
        style={{ fontFamily: "'Playfair Display', serif", color: 'var(--color-text)' }}
      >
        <ShieldCheck size={18} style={{ color: 'var(--color-brand)' }} /> 社区盲评 · 双重认证
      </h2>

      {/* 区域 1：盲评资格 */}
      <div
        className="rounded-lg p-3 mb-4 flex items-center gap-3"
        style={{
          background: eligible ? 'rgba(74,140,111,0.08)' : 'var(--color-bg)',
          border: `1px solid ${eligible ? 'rgba(74,140,111,0.25)' : 'var(--color-border)'}`,
        }}
      >
        {eligible ? (
          <>
            <CheckCircle size={20} style={{ color: '#4a8c6f', flexShrink: 0 }} />
            <p className="text-sm" style={{ color: 'var(--color-text)' }}>
              你当前 <strong style={{ color: '#4a8c6f' }}>{certScore}</strong> 分，具备社区盲评资格
            </p>
          </>
        ) : (
          <>
            <Clock size={20} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              达到 <strong style={{ color: 'var(--color-brand)' }}>70</strong> 分即可申请社区盲评
              （当前 {certScore} 分）
            </p>
          </>
        )}
      </div>

      {/* 区域 2：双重认证流程步骤图 */}
      <div
        className="mb-4"
        style={{ overflowX: 'auto' }}
      >
        <div
          className="flex items-center"
          style={{
            gap: 4,
            // mobile 下垂直排列
            flexDirection: 'row',
          }}
        >
          {REVIEW_STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className="flex items-center"
                style={{ flex: '1 1 0', minWidth: 0 }}
              >
                {/* 步骤节点 */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  className="flex flex-col items-center text-center"
                  style={{ flex: '1 1 0', minWidth: 0 }}
                >
                  <div
                    className="flex items-center justify-center rounded-full mb-1.5"
                    style={{
                      width: 36,
                      height: 36,
                      background: 'rgba(201,100,66,0.1)',
                      border: '1px solid rgba(201,100,66,0.2)',
                    }}
                  >
                    <Icon size={18} style={{ color: 'var(--color-brand)' }} />
                  </div>
                  <span
                    className="text-xs leading-tight"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {step.label}
                  </span>
                </motion.div>
                {/* 步骤间的虚线 + 箭头（最后一个不显示） */}
                {index < REVIEW_STEPS.length - 1 && (
                  <div
                    className="flex items-center"
                    style={{ flexShrink: 0 }}
                  >
                    <div
                      style={{
                        width: 16,
                        borderTop: '1px dashed var(--color-text-tertiary)',
                      }}
                    />
                    <ArrowRight size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 区域 3：申请状态 */}
      {eligible && status === 'idle' && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleApply}
          className="w-full rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
          style={{
            background: '#c96442',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <ShieldCheck size={16} /> 申请盲评
        </motion.button>
      )}

      {status === 'pending' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg p-3 flex items-center gap-3"
          style={{
            background: 'rgba(201,100,66,0.08)',
            border: '1px solid rgba(201,100,66,0.2)',
          }}
        >
          {/* spinner */}
          <div
            className="animate-spin rounded-full"
            style={{
              width: 18,
              height: 18,
              border: '2px solid rgba(201,100,66,0.25)',
              borderTopColor: '#c96442',
              flexShrink: 0,
            }}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              等待评审中...
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              预计 24 小时内完成
            </p>
          </div>
        </motion.div>
      )}

      {status === 'completed' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-lg p-4 flex items-center gap-3"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(251,191,36,0.18), rgba(251,191,36,0.05))',
            border: '1px solid rgba(251,191,36,0.4)',
            boxShadow: '0 0 16px rgba(251,191,36,0.15)',
          }}
        >
          {/* 金色双重认证徽章 */}
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 44,
              height: 44,
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              boxShadow: '0 0 12px rgba(251,191,36,0.5)',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={24} style={{ color: '#fff' }} />
          </div>
          <div className="min-w-0">
            <p
              className="text-sm font-bold flex items-center gap-1.5"
              style={{ color: '#b8860b' }}
            >
              <Award size={14} /> 双重认证已通过
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              3 位评审者综合评分 <strong style={{ color: '#b8860b' }}>92</strong> 分
            </p>
          </div>
        </motion.div>
      )}

      {/* 区域 4：活跃评审者排行榜 */}
      <div className="mt-5">
        <h3
          className="text-sm font-semibold mb-3 flex items-center gap-1.5"
          style={{ color: 'var(--color-text)' }}
        >
          <Users size={15} style={{ color: 'var(--color-brand)' }} /> 活跃评审者
        </h3>
        <div className="flex flex-col gap-2">
          {TOP_REVIEWERS.map((reviewer, index) => {
            const badgeStyle = BADGE_STYLES[reviewer.badge];
            return (
              <motion.div
                key={reviewer.name}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08, duration: 0.3 }}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {/* 排名 + 姓名 */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="text-xs font-bold"
                    style={{
                      width: 18,
                      color: index === 0 ? '#b8860b' : 'var(--color-text-tertiary)',
                    }}
                  >
                    #{index + 1}
                  </span>
                  <span
                    className="text-sm font-medium truncate"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {reviewer.name}
                  </span>
                </div>
                {/* 评审数 + 准确率 + 徽章 */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {reviewer.reviews} 评
                  </span>
                  <span
                    className="text-xs font-semibold flex items-center gap-0.5"
                    style={{ color: '#4a8c6f' }}
                  >
                    <Star size={11} fill="#4a8c6f" /> {reviewer.accuracy}%
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: badgeStyle.bg, color: badgeStyle.color }}
                  >
                    {reviewer.badge}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
