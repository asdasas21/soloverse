import { motion } from 'motion/react';

interface AbilityDNAProps {
  portrait: {
    curiosity: number;
    reliability: number;
    factChecking: number;
    diverseThinking: number;
    uncertaintyTolerance: number;
    lowEgoHighDrive: number;
  };
  certScore: number;
}

// 维度配置：标签、首字母、渐变色
const DIMENSIONS = [
  { key: 'curiosity', label: '好奇心', short: 'C', color: ['#6366f1', '#818cf8'] },
  { key: 'reliability', label: '靠谱', short: 'R', color: ['#4a8c6f', '#6dbf8e'] },
  { key: 'factChecking', label: '事实洁癖', short: 'F', color: ['#f59e0b', '#fbbf24'] },
  { key: 'diverseThinking', label: '多元化思维', short: 'D', color: ['#ec4899', '#f472b6'] },
  { key: 'uncertaintyTolerance', label: '忍受不确定性', short: 'U', color: ['#06b6d4', '#22d3ee'] },
  { key: 'lowEgoHighDrive', label: '低ego高自驱', short: 'L', color: ['#c96442', '#d97757'] },
] as const;

// 每条 DNA 的方块数
const BLOCKS_PER_ROW = 30;

// 圆环参数
const RING_RADIUS = 26;
const RING_STROKE = 4;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function AbilityDNA({ portrait, certScore }: AbilityDNAProps) {
  // 匹配度：基于综合分计算，封顶 99%
  const matchPercent = Math.min(Math.round((certScore / 90) * 100), 99);
  const ringOffset = RING_CIRCUMFERENCE - (matchPercent / 100) * RING_CIRCUMFERENCE;

  // 拼接 18 位 DNA 编码字符串
  const dnaCode = DIMENSIONS.map((d) => {
    const score = Math.round(portrait[d.key]);
    return `${d.short}${String(score).padStart(2, '0')}`;
  }).join('');

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
      {/* 标题栏：能力 DNA + 匹配度圆环 */}
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-lg font-bold"
          style={{
            fontFamily: "'Playfair Display', serif",
            color: 'var(--color-text)',
          }}
        >
          能力 DNA
        </h2>

        {/* 匹配度圆环 */}
        <div className="flex items-center gap-2">
          <span
            className="text-xs"
            style={{ color: 'var(--color-text-secondary)' }}
            title="基于综合能力分数计算，反映你与企业岗位需求的匹配程度"
          >
            匹配度
          </span>
          <div className="relative" style={{ width: 64, height: 64 }}>
            <svg width={64} height={64} viewBox="0 0 64 64">
              {/* 背景圆环 */}
              <circle
                cx={32}
                cy={32}
                r={RING_RADIUS}
                fill="none"
                stroke="var(--color-border)"
                strokeWidth={RING_STROKE}
              />
              {/* 进度圆环 */}
              <motion.circle
                cx={32}
                cy={32}
                r={RING_RADIUS}
                fill="none"
                stroke="#c96442"
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                transform="rotate(-90 32 32)"
                initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
                whileInView={{ strokeDashoffset: ringOffset }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>
            {/* 圆环中心百分比 */}
            <span
              className="absolute inset-0 flex items-center justify-center text-xs font-bold"
              style={{ color: 'var(--color-text)' }}
            >
              {matchPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* DNA 序列条 */}
      <div className="flex flex-col gap-2">
        {DIMENSIONS.map((dim, dimIndex) => {
          const score = portrait[dim.key];
          const activeCount = Math.round((score / 100) * BLOCKS_PER_ROW);

          return (
            <div key={dim.key} className="flex items-center gap-2">
              {/* 维度中文名 */}
              <span
                className="shrink-0 text-right"
                style={{
                  width: 80,
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                }}
              >
                {dim.label}
              </span>

              {/* 方块序列 */}
              <div className="flex" style={{ gap: 2 }}>
                {Array.from({ length: BLOCKS_PER_ROW }).map((_, i) => {
                  const isActive = i < activeCount;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scaleX: 0 }}
                      whileInView={{ opacity: 1, scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.2,
                        // 从左到右依次亮起：维度间错开 + 行内方块错开
                        delay: dimIndex * 0.05 + i * 0.008,
                      }}
                      style={{
                        width: 6,
                        height: 16,
                        borderRadius: 1,
                        transformOrigin: 'left center',
                        background: isActive
                          ? `linear-gradient(180deg, ${dim.color[0]}, ${dim.color[1]})`
                          : 'rgba(0,0,0,0.04)',
                      }}
                    />
                  );
                })}
              </div>

              {/* 分数 */}
              <span
                className="shrink-0 text-xs font-semibold"
                style={{
                  width: 24,
                  color: 'var(--color-text)',
                }}
              >
                {Math.round(score)}
              </span>
            </div>
          );
        })}
      </div>

      {/* DNA 编码 */}
      <div
        className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2"
        style={{
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
        }}
      >
        <span
          className="text-xs font-bold"
          style={{ color: '#c96442' }}
        >
          DNA
        </span>
        <span
          className="text-xs tracking-wider"
          style={{
            fontFamily: "'DM Sans', monospace",
            color: 'var(--color-text)',
            letterSpacing: 1,
          }}
        >
          {dnaCode}
        </span>
      </div>

      {/* DNA 编码解释 */}
      <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted, #87867f)', lineHeight: 1.5 }}>
        DNA 编码由 6 个能力维度首字母 + 两位分数组成（如 C72=好奇心 72 分），是你独一无二的能力指纹。匹配度基于综合能力分数计算，反映你与企业岗位需求的匹配程度。
      </p>
    </motion.section>
  );
}
