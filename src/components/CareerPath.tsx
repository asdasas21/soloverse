import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ChevronRight, Target, Sparkles, TrendingUp } from 'lucide-react';

// 能力画像类型
interface Portrait {
  curiosity: number;
  reliability: number;
  factChecking: number;
  diverseThinking: number;
  uncertaintyTolerance: number;
  lowEgoHighDrive: number;
}

interface CareerPathProps {
  portrait: Portrait;
  certScore: number;
}

// 维度 key 类型
type DimensionKey = keyof Portrait;

// 维度中文标签
const DIM_LABELS: Record<DimensionKey, string> = {
  curiosity: '好奇心',
  reliability: '靠谱',
  factChecking: '事实洁癖',
  diverseThinking: '多元化思维',
  uncertaintyTolerance: '忍受不确定性',
  lowEgoHighDrive: '低ego高自驱',
};

// 所有维度（固定顺序）
const DIMS: DimensionKey[] = [
  'curiosity',
  'reliability',
  'factChecking',
  'diverseThinking',
  'uncertaintyTolerance',
  'lowEgoHighDrive',
];

// 职业角色定义
interface CareerRole {
  id: string;
  title: string;
  icon: string;
  desc: string;
  weights: Record<DimensionKey, number>;
  threshold: number;
}

const CAREER_ROLES: CareerRole[] = [
  {
    id: 'architect',
    title: '系统架构师',
    icon: 'bi-diagram-3-fill',
    desc: '设计大规模分布式系统',
    weights: { diverseThinking: 0.3, uncertaintyTolerance: 0.25, factChecking: 0.2, reliability: 0.15, curiosity: 0.05, lowEgoHighDrive: 0.05 },
    threshold: 75,
  },
  {
    id: 'tech-lead',
    title: '技术负责人',
    icon: 'bi-people-fill',
    desc: '带领团队交付高质量产品',
    weights: { reliability: 0.3, lowEgoHighDrive: 0.2, diverseThinking: 0.2, factChecking: 0.15, curiosity: 0.1, uncertaintyTolerance: 0.05 },
    threshold: 72,
  },
  {
    id: 'research',
    title: '前沿研究员',
    icon: 'bi-search-heart',
    desc: '探索技术前沿，产出创新方案',
    weights: { curiosity: 0.35, factChecking: 0.25, diverseThinking: 0.2, uncertaintyTolerance: 0.1, lowEgoHighDrive: 0.05, reliability: 0.05 },
    threshold: 70,
  },
  {
    id: 'product-eng',
    title: '产品工程师',
    icon: 'bi-lightbulb-fill',
    desc: '用技术驱动产品创新',
    weights: { diverseThinking: 0.25, curiosity: 0.2, lowEgoHighDrive: 0.2, uncertaintyTolerance: 0.15, reliability: 0.1, factChecking: 0.1 },
    threshold: 68,
  },
  {
    id: 'reliability-eng',
    title: '稳定性工程师',
    icon: 'bi-shield-fill-check',
    desc: '保障系统高可用和稳定性',
    weights: { factChecking: 0.3, reliability: 0.3, uncertaintyTolerance: 0.2, lowEgoHighDrive: 0.1, diverseThinking: 0.05, curiosity: 0.05 },
    threshold: 70,
  },
  {
    id: 'fullstack',
    title: '全栈工程师',
    icon: 'bi-code-slash',
    desc: '端到端独立交付',
    weights: { reliability: 0.25, diverseThinking: 0.2, lowEgoHighDrive: 0.2, curiosity: 0.15, factChecking: 0.1, uncertaintyTolerance: 0.1 },
    threshold: 65,
  },
];

// 维度推荐试炼映射
const DIM_RECOMMENDATIONS: Record<DimensionKey, { trial: string; title: string }> = {
  curiosity: { trial: 'system-design', title: '高并发系统设计' },
  reliability: { trial: 'debug-master', title: '线上故障排查' },
  factChecking: { trial: 'code-review', title: '代码审查挑战' },
  diverseThinking: { trial: 'frontend-eng', title: '前端工程化挑战' },
  uncertaintyTolerance: { trial: 'rag-system', title: 'RAG 系统搭建' },
  lowEgoHighDrive: { trial: 'api-design', title: 'RESTful API 设计' },
};

// 加权平均计算匹配度（0-100）
function calcMatchScore(role: CareerRole, portrait: Portrait): number {
  return Object.entries(role.weights).reduce((sum, [dim, weight]) => {
    return sum + portrait[dim as DimensionKey] * weight;
  }, 0);
}

// 根据匹配度返回等级信息
function getMatchLevel(score: number): { label: string; color: string; bg: string } {
  if (score >= 80) {
    return { label: '高度匹配', color: '#4a8c6f', bg: 'rgba(74,140,111,0.12)' };
  }
  if (score >= 60) {
    return { label: '潜力方向', color: '#c96442', bg: 'rgba(201,100,66,0.12)' };
  }
  return { label: '待发展', color: 'var(--color-text-tertiary)', bg: 'rgba(94,93,89,0.1)' };
}

export default function CareerPath({ portrait, certScore: _certScore }: CareerPathProps) {
  // 计算所有角色匹配度并排序
  const rankedRoles = CAREER_ROLES.map((role) => ({
    role,
    score: calcMatchScore(role, portrait),
  })).sort((a, b) => b.score - a.score);

  const top3 = rankedRoles.slice(0, 3);
  const topRole = top3[0];

  // 目标角色各维度差距分析
  const gaps = DIMS.map((dim) => ({
    dim,
    current: portrait[dim],
    target: topRole.role.threshold,
    gap: topRole.role.threshold - portrait[dim], // 正数=需要提升，负数=已超出
  }));
  const sortedGaps = [...gaps].sort((a, b) => b.gap - a.gap);
  const biggestGap = sortedGaps[0];

  // 成长建议：取差距最大的 2 个维度（仅限需要提升的）
  const recDims = sortedGaps.filter((g) => g.gap > 0).slice(0, 2);

  return (
    <div className="space-y-6">
      {/* 区域 1：最佳职业匹配 Top 3 */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="rounded-xl p-5 border"
        style={{
          background: 'var(--color-card)',
          borderColor: 'var(--color-border)',
          boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.06)',
        }}
      >
        <h2
          className="text-lg font-bold mb-4 flex items-center gap-2"
          style={{ fontFamily: "'Playfair Display', serif", color: 'var(--color-text)' }}
        >
          <Target size={18} style={{ color: 'var(--color-brand)' }} /> 最佳职业匹配
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {top3.map(({ role, score }, index) => {
            const level = getMatchLevel(score);
            return (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                className="rounded-xl p-5 border"
                style={{
                  background: 'var(--color-card)',
                  borderColor: 'var(--color-border)',
                }}
              >
                {/* 图标 + 排名 */}
                <div className="flex items-center justify-between mb-3">
                  <i
                    className={`bi ${role.icon}`}
                    style={{ fontSize: '28px', color: 'var(--color-brand)' }}
                  />
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--color-bg)', color: 'var(--color-text-tertiary)' }}
                  >
                    #{index + 1}
                  </span>
                </div>
                {/* 标题 + 描述 */}
                <h3
                  className="text-base font-bold mb-1"
                  style={{ color: 'var(--color-text)' }}
                >
                  {role.title}
                </h3>
                <p
                  className="text-xs mb-3"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {role.desc}
                </p>
                {/* 匹配度百分比 */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-xs"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    匹配度
                  </span>
                  <span
                    className="text-lg font-bold"
                    style={{ fontFamily: "'Playfair Display', serif", color: level.color }}
                  >
                    {Math.round(score)}%
                  </span>
                </div>
                {/* 匹配度进度条 */}
                <div
                  className="rounded-full overflow-hidden"
                  style={{ height: 6, background: '#e8e6dc' }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${Math.min(score, 100)}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 + 0.3, duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: level.color }}
                  />
                </div>
                {/* 匹配等级标签 */}
                <span
                  className="inline-block mt-3 text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: level.bg, color: level.color }}
                >
                  {level.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* 区域 2：目标差距分析（针对 Top 1） */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-xl p-5 border"
        style={{
          background: 'var(--color-card)',
          borderColor: 'var(--color-border)',
        }}
      >
        <h2
          className="text-lg font-bold mb-1 flex items-center gap-2"
          style={{ fontFamily: "'Playfair Display', serif", color: 'var(--color-text)' }}
        >
          <TrendingUp size={18} style={{ color: 'var(--color-brand)' }} /> 目标差距分析
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          目标角色：<strong style={{ color: 'var(--color-brand)' }}>{topRole.role.title}</strong>
          ，达标线 {topRole.role.threshold} 分
        </p>

        {/* 各维度对比条形图 */}
        <div className="space-y-3">
          {gaps.map((g, index) => {
            const isBiggest = g.dim === biggestGap.dim;
            return (
              <motion.div
                key={g.dim}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06, duration: 0.3 }}
              >
                {/* 维度名 + 数值 */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: isBiggest ? 'var(--color-brand)' : 'var(--color-text)',
                    }}
                  >
                    {DIM_LABELS[g.dim]}
                    {isBiggest && g.gap > 0 && (
                      <span
                        className="ml-1.5 text-xs px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(201,100,66,0.12)', color: 'var(--color-brand)' }}
                      >
                        重点提升
                      </span>
                    )}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    <strong style={{ color: 'var(--color-text)' }}>{g.current}</strong>
                    {' / '}
                    {g.target}
                  </span>
                </div>
                {/* 双条对比：底色为目标线参考，前景为当前值 */}
                <div
                  className="relative rounded-full overflow-hidden"
                  style={{ height: 8, background: '#e8e6dc' }}
                >
                  {/* 目标线刻度 */}
                  <div
                    className="absolute top-0 bottom-0"
                    style={{
                      left: `${g.target}%`,
                      width: 2,
                      background: 'var(--color-text-tertiary)',
                      opacity: 0.5,
                    }}
                  />
                  {/* 当前值条 */}
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${Math.min(g.current, 100)}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.06 + 0.2, duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{
                      background: isBiggest && g.gap > 0 ? 'var(--color-brand)' : '#d97757',
                    }}
                  />
                </div>
                {/* 差距数值 */}
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                  {g.gap > 0 ? (
                    <>还差 <strong style={{ color: 'var(--color-brand)' }}>{g.gap}</strong> 分达标</>
                  ) : (
                    <>已超出达标线 <strong style={{ color: '#4a8c6f' }}>{Math.abs(g.gap)}</strong> 分</>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 最大差距维度建议文案 */}
        {biggestGap.gap > 0 && (
          <div
            className="mt-4 rounded-lg p-3"
            style={{ background: 'rgba(201,100,66,0.05)', border: '1px solid rgba(201,100,66,0.15)' }}
          >
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              建议优先提升 <strong style={{ color: 'var(--color-brand)' }}>{DIM_LABELS[biggestGap.dim]}</strong>
              ，当前 {biggestGap.current} 分距离 {topRole.role.title} 的达标线还有 {biggestGap.gap} 分差距，是该角色最关键的能力短板。
            </p>
          </div>
        )}
      </motion.section>

      {/* 区域 3：成长建议 */}
      {recDims.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-xl p-5 border"
          style={{
            background: 'var(--color-card)',
            borderColor: 'var(--color-border)',
            boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.06)',
          }}
        >
          <h2
            className="text-lg font-bold mb-4 flex items-center gap-2"
            style={{ fontFamily: "'Playfair Display', serif", color: 'var(--color-text)' }}
          >
            <Sparkles size={18} style={{ color: 'var(--color-brand)' }} /> 成长建议
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recDims.map((g, index) => {
              const rec = DIM_RECOMMENDATIONS[g.dim];
              return (
                <motion.div
                  key={g.dim}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                >
                  <Link
                    to={`/trials/${rec.trial}`}
                    className="flex items-center justify-between rounded-xl p-4 transition-all hover:shadow-md"
                    style={{
                      background: 'rgba(201,100,66,0.05)',
                      border: '1px solid rgba(201,100,66,0.15)',
                    }}
                  >
                    <div className="min-w-0">
                      <div className="text-xs mb-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                        提升 {DIM_LABELS[g.dim]} · 差 {g.gap} 分
                      </div>
                      <div
                        className="text-sm font-semibold"
                        style={{ color: 'var(--color-text)' }}
                      >
                        推荐试炼：{rec.title}
                      </div>
                    </div>
                    <ChevronRight size={20} style={{ color: 'var(--color-brand)', flexShrink: 0 }} />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.section>
      )}
    </div>
  );
}
