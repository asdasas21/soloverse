import { motion } from 'motion/react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface GrowthTimelineProps {
  history: Array<{
    name: string;
    date: string;
    score: number;
  }>;
}

// SVG 画布尺寸
const WIDTH = 500;
const HEIGHT = 200;
const PADDING = { top: 20, right: 20, bottom: 30, left: 40 };
const CHART_W = WIDTH - PADDING.left - PADDING.right;
const CHART_H = HEIGHT - PADDING.top - PADDING.bottom;

export default function GrowthTimeline({ history }: GrowthTimelineProps) {
  // 数据少于 1 条时不渲染
  if (!history || history.length < 1) return null;

  // 按日期排序（旧 → 新）
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));

  // 计算每个数据点的坐标
  const points = sorted.map((h, i) => ({
    x: PADDING.left + (sorted.length === 1 ? CHART_W / 2 : (i / (sorted.length - 1)) * CHART_W),
    y: PADDING.top + CHART_H - (h.score / 100) * CHART_H,
    ...h,
  }));

  // 折线路径
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  // 填充区域路径（折线下方）
  const areaPath =
    points.length === 1
      ? '' // 单点无法形成填充区域
      : `${linePath} L ${points[points.length - 1].x} ${PADDING.top + CHART_H} L ${points[0].x} ${PADDING.top + CHART_H} Z`;

  // 找出最高分与最低分（用于里程碑标记）
  const maxScore = Math.max(...sorted.map((h) => h.score));
  const minScore = Math.min(...sorted.map((h) => h.score));
  const maxPoint = points.find((p) => p.score === maxScore)!;
  const minPoint = points.find((p) => p.score === minScore)!;
  const showMilestone = sorted.length >= 2 && maxScore !== minScore;

  // Y 轴刻度（0、50、100）
  const yTicks = [0, 50, 100];

  // 进步洞察计算
  const firstScore = sorted[0].score;
  const lastScore = sorted[sorted.length - 1].score;
  const delta = lastScore - firstScore;
  const hasInsight = sorted.length >= 2;

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
      <h2
        className="text-lg font-bold mb-4"
        style={{ fontFamily: "'Playfair Display', serif", color: 'var(--color-text)' }}
      >
        成长时间线
      </h2>

      {/* 趋势折线图 */}
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        style={{ display: 'block' }}
        role="img"
        aria-label="综合分变化趋势"
      >
        <defs>
          {/* 渐变填充：从品牌色半透明到透明 */}
          <linearGradient id="growthArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(201,100,66,0.2)" />
            <stop offset="100%" stopColor="rgba(201,100,66,0)" />
          </linearGradient>
        </defs>

        {/* Y 轴刻度线与标签 */}
        {yTicks.map((tick) => {
          const y = PADDING.top + CHART_H - (tick / 100) * CHART_H;
          return (
            <g key={tick}>
              <line
                x1={PADDING.left}
                y1={y}
                x2={WIDTH - PADDING.right}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth={1}
                strokeDasharray="2 3"
              />
              <text
                x={PADDING.left - 6}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="var(--color-text-secondary)"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* 渐变填充区域 */}
        {areaPath && <path d={areaPath} fill="url(#growthArea)" />}

        {/* 折线 */}
        {points.length > 1 && (
          <path
            d={linePath}
            fill="none"
            stroke="#c96442"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* 最低分里程碑标记 */}
        {showMilestone && minPoint.score !== maxPoint.score && (
          <g>
            <circle cx={minPoint.x} cy={minPoint.y} r={6} fill="#c96442" opacity={0.18} />
            <text
              x={minPoint.x}
              y={minPoint.y - 12}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill="#c96442"
            >
              最低 {minPoint.score}
            </text>
          </g>
        )}

        {/* 最高分里程碑标记 */}
        {showMilestone && (
          <g>
            <circle cx={maxPoint.x} cy={maxPoint.y} r={6} fill="#c96442" opacity={0.18} />
            <text
              x={maxPoint.x}
              y={maxPoint.y - 12}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill="#c96442"
            >
              最高 {maxPoint.score}
            </text>
          </g>
        )}

        {/* 普通数据点 */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3.5}
            fill="#c96442"
            stroke="var(--color-card)"
            strokeWidth={1.5}
          />
        ))}

        {/* X 轴日期标签 */}
        {points.map((p, i) => (
          <text
            key={`x-${i}`}
            x={p.x}
            y={HEIGHT - 8}
            textAnchor="middle"
            fontSize="10"
            fill="var(--color-text-secondary)"
          >
            {p.date.slice(5)}
          </text>
        ))}
      </svg>

      {/* 进步洞察 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="mt-4 rounded-lg p-3"
        style={{
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
        }}
      >
        {hasInsight ? (
          delta > 0 ? (
            // 进步为正：绿色 + 向上箭头
            <div className="flex items-start gap-2">
              <TrendingUp size={18} style={{ color: '#4a8c6f', marginTop: 1, flexShrink: 0 }} />
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                你的试炼分数从{' '}
                <strong style={{ color: '#4a8c6f' }}>{firstScore}</strong> 提升到了{' '}
                <strong style={{ color: '#4a8c6f' }}>{lastScore}</strong>，进步了{' '}
                <strong style={{ color: '#4a8c6f' }}>{delta}</strong> 分
              </p>
            </div>
          ) : delta < 0 ? (
            // 退步：品牌色 + 提醒文案
            <div className="flex items-start gap-2">
              <TrendingDown size={18} style={{ color: '#c96442', marginTop: 1, flexShrink: 0 }} />
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                你的综合分从 <strong>{firstScore}</strong> 变动到了{' '}
                <strong style={{ color: '#c96442' }}>{lastScore}</strong>，下降了{' '}
                <strong style={{ color: '#c96442' }}>{Math.abs(delta)}</strong> 分，调整状态，继续挑战
              </p>
            </div>
          ) : (
            // 持平
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              综合分保持稳定在 <strong>{lastScore}</strong> 分，尝试新试炼突破现状
            </p>
          )
        ) : (
          // 仅 1 条记录：鼓励文案
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            完成更多试炼，解锁成长轨迹
          </p>
        )}
      </motion.div>
    </motion.section>
  );
}
