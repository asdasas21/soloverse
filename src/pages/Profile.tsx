import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Award, BookOpen, Shield, ChevronRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import RadarChartWrapper from '@/components/RadarChart';
import {
  computePortrait,
  computeCertScore,
  getCertLevel,
  generateMockEvents,
  type Dimension,
} from '@/utils/emaEngine';

const DIM_LABELS: Record<Dimension, string> = {
  curiosity: '好奇心',
  reliability: '靠谱',
  factChecking: '事实洁癖',
  diverseThinking: '多元化思维',
  uncertaintyTolerance: '忍受不确定性',
  lowEgoHighDrive: '低ego高自驱',
};

const DIM_TAGS: Record<Dimension, string[]> = {
  curiosity: ['主动提问', '跨领域探索', '深度追问'],
  reliability: ['按时交付', '承诺兑现', '质量稳定'],
  factChecking: ['溯源验证', '数据驱动', '辨伪求真'],
  diverseThinking: ['多角度分析', '包容异见', '创新方案'],
  uncertaintyTolerance: ['拥抱模糊', '快速试错', '从容应对'],
  lowEgoHighDrive: ['虚心接受反馈', '持续精进', '目标导向'],
};

const MOCK_TARGETS = [78, 85, 72, 88, 65, 82];

const TRIAL_HISTORY = [
  { name: '逻辑推理能力', date: '2026-05-20', score: 82 },
  { name: '批判性思维', date: '2026-04-15', score: 76 },
  { name: '信息甄别', date: '2026-03-10', score: 88 },
  { name: '开放性思维', date: '2026-02-08', score: 71 },
];

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const start = useRef<number | null>(null);
  useEffect(() => {
    start.current = null;
    const step = (ts: number) => {
      if (!start.current) start.current = ts;
      const progress = Math.min((ts - start.current) / duration, 1);
      setValue(Math.round(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

function ScoreCard({ dim, score, index }: { dim: Dimension; score: number; index: number }) {
  const displayed = useCountUp(score);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="rounded-xl p-4 border"
      style={{
        background: 'var(--color-card)',
        borderColor: 'var(--color-border)',
        boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          {DIM_LABELS[dim]}
        </span>
        <span className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--color-brand)' }}>
          {displayed}
        </span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: '#e8e6dc' }}>
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${score}%` }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 + 0.3, duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: 'var(--color-brand)' }}
        />
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {DIM_TAGS[dim].map((tag) => (
          <span
            key={tag}
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(201,100,66,0.1)', color: 'var(--color-brand)' }}
          >
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

const dims: Dimension[] = [
  'curiosity', 'reliability', 'factChecking',
  'diverseThinking', 'uncertaintyTolerance', 'lowEgoHighDrive',
];

export default function Profile() {
  const portrait = computePortrait(generateMockEvents(MOCK_TARGETS));
  const certScore = computeCertScore(portrait);
  const certLevel = getCertLevel(certScore);

  const radarData = dims.map((d) => ({
    name: DIM_LABELS[d],
    value: portrait[d],
  }));

  const levelLabel = certLevel === 'C3' ? '专家级' : certLevel === 'C2' ? '专业级' : certLevel === 'C1' ? '基础级' : '未认证';

  return (
    <div className="min-h-screen pb-12" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-2xl mx-auto px-4 pt-8">
        {/* Back button */}
        <Link to="/" className="inline-flex items-center gap-1 mb-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <ArrowLeft size={16} /> 返回
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-5 mb-8"
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
            style={{ background: 'var(--color-brand)', color: '#fff' }}
          >
            张三
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--color-text)' }}>
              张三
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {certLevel && (
                <span
                  className="inline-flex items-center gap-1 text-sm font-semibold px-3 py-0.5 rounded-full"
                  style={{
                    background: 'rgba(201,100,66,0.12)',
                    color: 'var(--color-brand)',
                    animation: 'badge-glow 2s ease-in-out infinite',
                  }}
                >
                  <Award size={14} /> {certLevel} {levelLabel}
                </span>
              )}
              <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                综合分 {certScore}
              </span>
            </div>
          </div>
          <Link to="/certificate" className="shrink-0">
            <ChevronRight size={20} style={{ color: 'var(--color-text-tertiary)' }} />
          </Link>
        </motion.div>

        {/* Radar Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl p-4 mb-6 border"
          style={{
            background: 'var(--color-card)',
            borderColor: 'var(--color-border)',
            boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.06)',
          }}
        >
          <h2 className="text-lg font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--color-text)' }}>
            能力雷达图
          </h2>
          <div className="w-full aspect-square max-w-sm mx-auto">
            <RadarChartWrapper data={radarData} title="能力画像" animate />
          </div>
        </motion.div>

        {/* Dimension Detail Cards */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {dims.map((d, i) => (
            <ScoreCard key={d} dim={d} score={portrait[d]} index={i} />
          ))}
        </div>

        {/* Trial History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--color-text)' }}>
            <BookOpen size={18} /> 评测历史
          </h2>
          <div className="space-y-2">
            {TRIAL_HISTORY.map((t) => (
              <div
                key={t.name}
                className="flex items-center justify-between rounded-lg px-4 py-3 border"
                style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
              >
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{t.name}</div>
                  <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{t.date}</div>
                </div>
                <span className="font-bold" style={{ color: 'var(--color-brand)' }}>{t.score}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Certification */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl p-5 border"
          style={{
            background: 'var(--color-card)',
            borderColor: 'var(--color-border)',
            boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.06)',
          }}
        >
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--color-text)' }}>
            <Shield size={18} /> 认证状态
          </h2>
          {certLevel ? (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{
                    background: 'var(--color-brand)',
                    color: '#fff',
                    animation: 'badge-glow 2s ease-in-out infinite',
                  }}
                >
                  {certLevel}
                </div>
                <div>
                  <div className="font-bold" style={{ color: 'var(--color-text)' }}>{levelLabel}</div>
                  <div className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                    综合分 {certScore} / 100
                  </div>
                </div>
              </div>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                已满足 {certLevel} 认证要求：综合分 ≥ {certLevel === 'C3' ? 88 : certLevel === 'C2' ? 75 : 60} 分
              </p>
              <Link
                to="/certificate"
                className="inline-flex items-center gap-1 text-sm font-medium mt-2"
                style={{ color: 'var(--color-brand)' }}
              >
                查看证书 <ChevronRight size={14} />
              </Link>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              尚未达到认证门槛（综合分 ≥ 60），继续努力！
            </p>
          )}
        </motion.div>
      </div>

      <style>{`
        @keyframes badge-glow {
          0%, 100% { box-shadow: 0 0 4px rgba(201,100,66,0.3); }
          50% { box-shadow: 0 0 12px rgba(201,100,66,0.6), 0 0 20px rgba(201,100,66,0.2); }
        }
      `}</style>
    </div>
  );
}
