import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Clock, Users, Flame, Layers } from "lucide-react";
import { type TrialCard } from "@/store/trialStore";
import { getTrials } from "@/api/client";
import { getTrialPhases, PHASE_TYPE_META } from "@/data/trialPhases";

const difficultyConfig: Record<
  TrialCard["difficulty"],
  { label: string; color: string; bg: string }
> = {
  beginner: { label: "入门", color: "text-emerald-700", bg: "bg-emerald-50" },
  intermediate: {
    label: "进阶",
    color: "text-amber-700",
    bg: "bg-amber-50",
  },
  advanced: { label: "高级", color: "text-red-700", bg: "bg-red-50" },
};

function TrialCardComponent({ trial, index }: { trial: TrialCard; index: number }) {
  const navigate = useNavigate();
  const diff = difficultyConfig[trial.difficulty];
  const phases = getTrialPhases(trial.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.12, duration: 0.4, ease: "easeOut" }}
      whileHover={{ scale: 1.02, boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}
      className="rounded-xl border border-[#e8e6dc] bg-[#faf9f5] p-6 cursor-pointer transition-colors"
      style={{ boxShadow: "0px 0px 0px 1px rgba(0,0,0,0.06)" }}
      onClick={() => navigate(`/trials/${trial.id}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-[#141413]" style={{ fontFamily: "'Playfair Display', serif" }}>
          {trial.title}
        </h3>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${diff.bg} ${diff.color}`}>
          {diff.label}
        </span>
      </div>

      <p className="text-sm text-[#5e5d59] mb-4 leading-relaxed">{trial.description}</p>

      {/* 多阶段标签 */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        <Layers size={12} style={{ color: "#c96442" }} />
        <span className="text-[11px] font-medium" style={{ color: "#87867f" }}>{phases.length} 阶段评估：</span>
        {phases.map((phase, _i) => {
          const meta = PHASE_TYPE_META[phase.type];
          return (
            <span
              key={phase.id}
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ background: `${meta.color}12`, color: meta.color }}
            >
              {phase.title}
            </span>
          );
        })}
      </div>

      <div className="flex items-center gap-4 text-xs text-[#87867f] mb-5">
        <span className="flex items-center gap-1.5">
          <Clock size={14} />
          {trial.duration}
        </span>
        <span className="flex items-center gap-1.5">
          <Users size={14} />
          {trial.participants} 人参与
        </span>
      </div>

      <button
        className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-colors hover:bg-[#d97757]"
        style={{ background: "#c96442" }}
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/trials/${trial.id}`);
        }}
      >
        参加试炼
      </button>
    </motion.div>
  );
}

export default function Trials() {
  const [trials, setTrials] = useState<TrialCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTrials()
      .then((res: any) => {
        if (!cancelled) {
          const data = res.data || res;
          if (Array.isArray(data) && data.length > 0) {
            setTrials(data);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "获取试炼列表失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f4ed]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-5xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-3">
            <Flame size={28} style={{ color: "#c96442" }} />
            <h1
              className="text-3xl font-bold text-[#141413]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              试炼大厅
            </h1>
          </div>
          <p className="text-[#5e5d59] text-base max-w-xl leading-relaxed">
            选择一项真实工程场景。你将在交互式工作区中操作——做决策、写代码、审查代码变更（diff）、画架构。AI 在后台静默采集行为数据，不是聊天口试。
          </p>
        </motion.div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-[#e8e6dc] border-t-[#c96442] rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-[#87867f] text-sm"
          >
            <p><i className="bi bi-exclamation-triangle" style={{ color: '#c96442' }} /> {error}</p>
            <button onClick={() => window.location.reload()} className="mt-3 text-xs underline" style={{ color: '#c96442' }}>点击重试</button>
          </motion.div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {trials.map((trial, i) => (
              <TrialCardComponent key={trial.id} trial={trial} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
