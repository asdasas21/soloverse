import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Clock, Users, Trophy, Flame } from "lucide-react";
import { TRIALS, type TrialCard } from "@/store/trialStore";

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

      <p className="text-sm text-[#5e5d59] mb-5 leading-relaxed">{trial.description}</p>

      <div className="flex items-center gap-4 text-xs text-[#87867f] mb-5">
        <span className="flex items-center gap-1.5">
          <Clock size={14} />
          {trial.duration}
        </span>
        <span className="flex items-center gap-1.5">
          <Users size={14} />
          {trial.participants} 人参与
        </span>
        <span className="flex items-center gap-1.5">
          <Trophy size={14} />
          {trial.type === "hackathon" ? "黑客松" : "代码审查"}
        </span>
      </div>

      <button
        className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
        style={{ background: "#c96442" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#d97757")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#c96442")}
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
            选择一项试炼挑战，与 AI 导师实时互动，展现你的技术实力。完成试炼即可获得能力评估报告。
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TRIALS.map((trial, i) => (
            <TrialCardComponent key={trial.id} trial={trial} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
