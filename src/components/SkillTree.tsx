import { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Check, Star, Trophy, Flag, Flame } from 'lucide-react';

// 能力画像类型
interface Portrait {
  curiosity: number;
  reliability: number;
  factChecking: number;
  diverseThinking: number;
  uncertaintyTolerance: number;
  lowEgoHighDrive: number;
}

interface SkillTreeProps {
  portrait: Portrait;
  certScore: number;
  trialCount: number; // 完成的试炼数量
}

// 技能节点定义
interface SkillNode {
  id: string;
  name: string;
  desc: string;
  icon: string; // bootstrap icon
  tier: number; // 1, 2, 3
  requirement: {
    // 解锁条件
    dimension?: string; // 需要的维度
    minScore?: number; // 最低分数
    minTrials?: number; // 最低试炼数
    minCertScore?: number;
  };
}

// 技能树数据：3 层共 10 个节点
const SKILL_TREE: SkillNode[] = [
  // Tier 1 — 基础（入门即可解锁）
  {
    id: 'first-step',
    name: '初探者',
    desc: '完成第一次试炼',
    icon: 'bi-flag-fill',
    tier: 1,
    requirement: { minTrials: 1 },
  },
  {
    id: 'curious-mind',
    name: '好奇之心',
    desc: '好奇心达到 60',
    icon: 'bi-lightbulb-fill',
    tier: 1,
    requirement: { dimension: 'curiosity', minScore: 60 },
  },
  {
    id: 'reliable',
    name: '靠谱新人',
    desc: '靠谱维度达到 60',
    icon: 'bi-shield-check',
    tier: 1,
    requirement: { dimension: 'reliability', minScore: 60 },
  },
  // Tier 2 — 进阶
  {
    id: 'fact-finder',
    name: '真相猎手',
    desc: '事实洁癖达到 70',
    icon: 'bi-search',
    tier: 2,
    requirement: { dimension: 'factChecking', minScore: 70 },
  },
  {
    id: 'diverse-thinker',
    name: '多元思考者',
    desc: '多元化思维达到 70',
    icon: 'bi-diagram-2-fill',
    tier: 2,
    requirement: { dimension: 'diverseThinking', minScore: 70 },
  },
  {
    id: 'certified',
    name: '认证持有者',
    desc: '综合分达到 60',
    icon: 'bi-patch-check-fill',
    tier: 2,
    requirement: { minCertScore: 60 },
  },
  {
    id: 'persistent',
    name: '持续挑战者',
    desc: '完成 3 次试炼',
    icon: 'bi-fire',
    tier: 2,
    requirement: { minTrials: 3 },
  },
  // Tier 3 — 大师
  {
    id: 'architect',
    name: '架构思维',
    desc: '所有维度达到 75',
    icon: 'bi-diagram-3-fill',
    tier: 3,
    requirement: { minScore: 75 },
  },
  {
    id: 'master',
    name: '能力大师',
    desc: '综合分达到 85',
    icon: 'bi-trophy-fill',
    tier: 3,
    requirement: { minCertScore: 85 },
  },
  {
    id: 'polymath',
    name: '全能者',
    desc: '完成所有试炼类型',
    icon: 'bi-stars',
    tier: 3,
    requirement: { minTrials: 5 },
  },
];

// 维度中文标签（用于 tooltip 展示）
const DIM_LABELS: Record<string, string> = {
  curiosity: '好奇心',
  reliability: '靠谱',
  factChecking: '事实洁癖',
  diverseThinking: '多元化思维',
  uncertaintyTolerance: '忍受不确定性',
  lowEgoHighDrive: '低ego高自驱',
};

// 按层级分组
const TIER_CONFIG = [
  { tier: 3, label: '大师', color: '#fbbf24', icon: Trophy },
  { tier: 2, label: '进阶', color: '#c96442', icon: Star },
  { tier: 1, label: '基础', color: '#87867f', icon: Flag },
] as const;

// 判断节点是否已解锁
function checkUnlocked(
  node: SkillNode,
  portrait: Portrait,
  certScore: number,
  trialCount: number,
): boolean {
  const { dimension, minScore, minTrials, minCertScore } = node.requirement;
  // 试炼次数要求
  if (minTrials !== undefined && trialCount < minTrials) return false;
  // 综合分要求
  if (minCertScore !== undefined && certScore < minCertScore) return false;
  // 带维度的分数要求
  if (dimension && minScore !== undefined) {
    const score = portrait[dimension as keyof Portrait];
    if (score < minScore) return false;
  }
  // 不带维度 = 所有维度都要达到
  if (minScore !== undefined && !dimension) {
    if (Object.values(portrait).some((s) => s < minScore)) return false;
  }
  return true;
}

// 生成节点的解锁条件描述文案
function getRequirementText(node: SkillNode): string {
  const { dimension, minScore, minTrials, minCertScore } = node.requirement;
  if (minTrials !== undefined) return `完成 ${minTrials} 次试炼`;
  if (minCertScore !== undefined) return `综合分达到 ${minCertScore}`;
  if (dimension && minScore !== undefined) {
    return `${DIM_LABELS[dimension] ?? dimension} 达到 ${minScore}`;
  }
  if (minScore !== undefined) return `所有维度达到 ${minScore}`;
  return '';
}

export default function SkillTree({ portrait, certScore, trialCount }: SkillTreeProps) {
  // hover 中的节点 id
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // 计算每个节点的解锁状态
  const nodes = SKILL_TREE.map((node) => ({
    ...node,
    unlocked: checkUnlocked(node, portrait, certScore, trialCount),
  }));

  // 已解锁数量
  const unlockedCount = nodes.filter((n) => n.unlocked).length;

  // 按层级分组（从顶到底：3 → 2 → 1）
  const tierGroups = TIER_CONFIG.map((cfg) => ({
    ...cfg,
    items: nodes.filter((n) => n.tier === cfg.tier),
  }));

  // 计算每层的横向位置（用于绘制连接线）
  // 每层中各节点的中心 x 比例
  const getTierPositions = (count: number) =>
    Array.from({ length: count }, (_, i) => (count === 1 ? 0.5 : i / (count - 1)));

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="rounded-xl p-5 border w-full relative"
      style={{
        background: 'var(--color-card)',
        borderColor: 'var(--color-border)',
        maxWidth: 500,
      }}
    >
      {/* 标题栏 + 进度统计 */}
      <div className="flex items-center justify-between mb-5">
        <h2
          className="text-lg font-bold flex items-center gap-2"
          style={{
            fontFamily: "'Playfair Display', serif",
            color: 'var(--color-text)',
          }}
        >
          <Flame size={18} style={{ color: 'var(--color-brand)' }} />
          技能树
        </h2>
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{
            background: 'var(--color-bg)',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          已解锁 <strong style={{ color: 'var(--color-brand)' }}>{unlockedCount}</strong> /{' '}
          {SKILL_TREE.length} 个技能
        </span>
      </div>

      {/* 树形容器 */}
      <div className="relative">
        {/* 层级间连接线（SVG 覆盖层） */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ zIndex: 0 }}
        >
          {tierGroups.slice(0, -1).map((upperTier, tierIdx) => {
            const lowerTier = tierGroups[tierIdx + 1];
            const upperPos = getTierPositions(upperTier.items.length);
            const lowerPos = getTierPositions(lowerTier.items.length);
            // 层级 y 中心（按层级顺序：0=顶部）
            const yUpper = (tierIdx + 0.5) * (100 / tierGroups.length);
            const yLower = (tierIdx + 1.5) * (100 / tierGroups.length);
            return (
              <g key={`lines-${tierIdx}`}>
                {upperPos.map((ux, ui) =>
                  lowerPos.map((lx, li) => (
                    <line
                      key={`${tierIdx}-${ui}-${li}`}
                      x1={`${ux * 100}`}
                      y1={`${yUpper}`}
                      x2={`${lx * 100}`}
                      y2={`${yLower}`}
                      stroke="var(--color-border)"
                      strokeWidth={0.3}
                      strokeDasharray="1 1"
                      vectorEffect="non-scaling-stroke"
                    />
                  )),
                )}
              </g>
            );
          })}
        </svg>

        {/* 层级列表 */}
        <div className="relative space-y-8" style={{ zIndex: 1 }}>
          {tierGroups.map((group, tierIdx) => {
            const TierIcon = group.icon;
            const positions = getTierPositions(group.items.length);
            return (
              <motion.div
                key={`tier-${group.tier}`}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: tierIdx * 0.15, duration: 0.4 }}
              >
                {/* 层级标签 */}
                <div className="flex items-center gap-2 mb-3">
                  <TierIcon size={14} style={{ color: group.color }} />
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: group.color }}
                  >
                    Tier {group.tier} · {group.label}
                  </span>
                  <div
                    className="flex-1 h-px"
                    style={{ background: 'var(--color-border)' }}
                  />
                </div>

                {/* 节点行 */}
                <div
                  className="grid gap-3"
                  style={{
                    gridTemplateColumns: `repeat(${group.items.length}, minmax(0, 1fr))`,
                  }}
                >
                  {group.items.map((node, nodeIdx) => (
                    <SkillNodeCard
                      key={node.id}
                      node={node}
                      tierColor={group.color}
                      isHovered={hoveredId === node.id}
                      onHoverChange={(h) => setHoveredId(h ? node.id : null)}
                      staggerDelay={tierIdx * 0.15 + nodeIdx * 0.08}
                      _position={positions[nodeIdx]}
                    />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

// 单个技能节点卡片
interface SkillNodeCardProps {
  node: SkillNode & { unlocked: boolean };
  tierColor: string;
  isHovered: boolean;
  onHoverChange: (hovered: boolean) => void;
  staggerDelay: number;
  _position: number;
}

function SkillNodeCard({
  node,
  tierColor,
  isHovered,
  onHoverChange,
  staggerDelay,
}: SkillNodeCardProps) {
  const { unlocked } = node;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: staggerDelay, duration: 0.35, ease: 'easeOut' }}
      className="relative flex flex-col items-center"
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      style={{ cursor: 'default' }}
    >
      {/* 图标容器（六角形外观，用圆形 + 旋转方块近似） */}
      <div className="relative" style={{ width: 50, height: 50 }}>
        <motion.div
          animate={
            unlocked
              ? {
                  boxShadow: `0 0 0 2px ${tierColor}, 0 0 14px ${tierColor}66`,
                }
              : {
                  boxShadow: '0 0 0 1px var(--color-border)',
                }
          }
          transition={{ duration: 0.3 }}
          className="absolute inset-0 rounded-full flex items-center justify-center"
          style={{
            background: unlocked ? `${tierColor}1a` : 'rgba(0,0,0,0.04)',
            border: `1.5px solid ${unlocked ? tierColor : '#c0c0c0'}`,
          }}
        >
          {unlocked ? (
            <>
              {/* 已解锁：bootstrap 图标彩色 */}
              <i
                className={`bi ${node.icon}`}
                style={{ fontSize: '22px', color: tierColor }}
              />
              {/* 右下角解锁标记 */}
              <span
                className="absolute -bottom-0.5 -right-0.5 rounded-full flex items-center justify-center"
                style={{
                  width: 16,
                  height: 16,
                  background: tierColor,
                  border: '2px solid var(--color-card)',
                }}
              >
                <Check size={9} color="#fff" strokeWidth={3.5} />
              </span>
            </>
          ) : (
            <>
              {/* 未解锁：灰色 + 锁图标覆盖 */}
              <i
                className={`bi ${node.icon}`}
                style={{ fontSize: '22px', color: '#c0c0c0' }}
              />
              <span
                className="absolute inset-0 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(250,249,245,0.78)' }}
              >
                <Lock size={16} color="#a8a8a0" />
              </span>
            </>
          )}
        </motion.div>

        {/* 已解锁节点的呼吸光晕 */}
        {unlocked && (
          <motion.span
            className="absolute inset-0 rounded-full pointer-events-none"
            animate={{
              boxShadow: [
                `0 0 0 0 ${tierColor}00`,
                `0 0 10px 2px ${tierColor}55`,
                `0 0 0 0 ${tierColor}00`,
              ],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </div>

      {/* 节点名称 */}
      <span
        className="mt-2 text-center text-xs font-medium leading-tight"
        style={{
          color: unlocked ? 'var(--color-text)' : 'var(--color-text-muted)',
        }}
      >
        {node.name}
      </span>

      {/* Tooltip：desc + 解锁条件 */}
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute z-20 left-1/2 -translate-x-1/2"
          style={{
            bottom: 'calc(100% + 8px)',
            width: 160,
          }}
        >
          <div
            className="rounded-lg px-3 py-2 shadow-lg"
            style={{
              background: 'var(--color-text)',
              color: '#faf9f5',
            }}
          >
            <div className="text-xs font-semibold mb-1">{node.name}</div>
            <div className="text-[11px] opacity-90 leading-snug">{node.desc}</div>
            <div
              className="mt-1.5 pt-1.5 text-[10px] flex items-center gap-1"
              style={{
                borderTop: '1px solid rgba(255,255,255,0.15)',
                color: unlocked ? '#86efac' : 'rgba(250,249,245,0.7)',
              }}
            >
              {unlocked ? (
                <>
                  <Check size={10} /> 已解锁
                </>
              ) : (
                <>
                  <Lock size={10} /> 解锁条件：{getRequirementText(node)}
                </>
              )}
            </div>
          </div>
          {/* 小三角箭头 */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              top: '100%',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid var(--color-text)',
            }}
          />
        </motion.div>
      )}
    </motion.div>
  );
}
