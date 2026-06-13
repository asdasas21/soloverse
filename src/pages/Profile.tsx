import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Award, BookOpen, Shield, ChevronRight, ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import RadarChartWrapper from '@/components/RadarChart';
import {
  computeCertScore,
  getCertLevel,
  type Dimension,
} from '@/utils/emaEngine';
import { getProfile } from '@/api/client';

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
  const { id: userId } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [apiData, setApiData] = useState<any>(null);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;
    getProfile(userId)
      .then((res: any) => { if (!cancelled) setApiData(res.data || res); })
      .catch((err) => { if (!cancelled) { console.error('[profile] load failed:', err); setApiData(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  const { portrait, certScore, certLevel, trialHistory } = useMemo(() => {
    // Use real API data; show empty portrait while loading
    const p = apiData?.portrait ?? {
      curiosity: 0, reliability: 0, factChecking: 0,
      diverseThinking: 0, uncertaintyTolerance: 0, lowEgoHighDrive: 0,
    };
    const cs = apiData?.certScore ?? computeCertScore(p);
    const cl = apiData?.certLevel ?? getCertLevel(cs);
    return {
      portrait: p,
      certScore: cs,
      certLevel: cl,
      trialHistory: apiData?.trialHistory ?? [],
    };
  }, [apiData]);

  const radarData = dims.map((d) => ({
    name: DIM_LABELS[d],
    value: portrait[d],
  }));

  const levelLabel = certLevel === 'C3' ? '专家级' : certLevel === 'C2' ? '专业级' : certLevel === 'C1' ? '基础级' : '未认证';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="w-8 h-8 border-3 border-[#e8e6dc] border-t-[#c96442] rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = apiData?.profile?.display_name || apiData?.profile?.username || '用户';
  const initials = displayName.slice(0, 2);

  // 空状态：用户还没有完成任何试炼
  const hasEvaluation = apiData?.portrait && apiData.portrait.curiosity !== undefined && (apiData.portrait.curiosity > 0 || apiData.portrait.reliability > 0);
  if (!hasEvaluation) {
    return (
      <div className="min-h-screen pb-12" style={{ background: 'var(--color-bg)' }}>
        <div className="max-w-2xl mx-auto px-4 pt-8">
          <Link to="/" className="inline-flex items-center gap-1 mb-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <ArrowLeft size={16} /> 返回
          </Link>
          <div className="flex items-center gap-5 mb-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0" style={{ background: 'var(--color-brand)', color: '#fff' }}>
              {initials}
            </div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--color-text)' }}>
              {displayName}
            </h1>
          </div>
          <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <i className="bi bi-bullseye" style={{ fontSize: "40px", color: "#c96442" }} />
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>还没有试炼记录</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              完成你的第一次试炼，获取专属能力画像和认证证书
            </p>
            <Link to="/trials" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--color-brand)' }}>
              开始试炼
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--color-text)' }}>
              {displayName}
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
          <Link to={`/cert/${userId}`} className="shrink-0">
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
            {trialHistory.map((t: any) => (
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
                to={`/cert/${userId}`}
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

        {/* 能力成长路径 */}
        {hasEvaluation && (() => {
          const dims = (Object.entries(portrait) as [string, number][]).sort((a, b) => a[1] - b[1]);
          const weakest = dims[0];
          const strongest = dims[dims.length - 1];
          const recommendations: Record<string, { trial: string; title: string; reason: string }> = {
            curiosity: { trial: 'system-design', title: '高并发系统设计', reason: '拓展你的架构视野，激发探索复杂系统的兴趣' },
            reliability: { trial: 'debug-master', title: '线上故障排查', reason: '锻炼系统化的问题解决能力，提升工程靠谱度' },
            factChecking: { trial: 'code-review', title: '代码审查挑战', reason: '培养严谨的代码审查习惯和细节敏感度' },
            diverseThinking: { trial: 'frontend-eng', title: '前端工程化挑战', reason: '接触不同技术栈，拓宽思维方式' },
            uncertaintyTolerance: { trial: 'rag-system', title: 'RAG 系统搭建', reason: '在不确定性中做技术决策，锻炼判断力' },
            lowEgoHighDrive: { trial: 'api-design', title: 'RESTful API 设计', reason: '从基础做起，建立扎实的技术自驱力' },
          };
          const rec = recommendations[weakest[0]] || recommendations.curiosity;
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl p-6 mt-4"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
            >
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--color-text)' }}>
                <i className="bi bi-signpost-2" style={{ fontSize: '18px', color: 'var(--color-brand)' }} /> 成长路径
              </h2>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                你的优势维度是 <strong style={{ color: 'var(--color-brand)' }}>{DIM_LABELS[strongest[0] as keyof typeof DIM_LABELS] || String(strongest[0])}</strong>（{String(strongest[1])}分），
                建议下一步提升 <strong style={{ color: 'var(--color-brand)' }}>{DIM_LABELS[weakest[0] as keyof typeof DIM_LABELS] || String(weakest[0])}</strong>（{String(weakest[1])}分）
              </p>
              <Link
                to={`/trials/${rec.trial}`}
                className="flex items-center justify-between rounded-xl p-4 transition-all hover:shadow-md"
                style={{ background: 'rgba(201,100,66,0.05)', border: '1px solid rgba(201,100,66,0.15)' }}
              >
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>推荐试炼：{rec.title}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{rec.reason}</div>
                </div>
                <ChevronRight size={20} style={{ color: 'var(--color-brand)' }} />
              </Link>
            </motion.div>
          );
        })()}
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
