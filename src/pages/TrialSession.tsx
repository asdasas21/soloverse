import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Trophy, Award, ChevronRight, Eye, TrendingUp, CheckCircle2, Zap } from "lucide-react";
import { getTrial, type TrialData } from "@/api/client";
import { useAuthStore } from "@/store/authStore";
import { getTrialScenarios, type ScenarioEvent } from "@/data/scenarioEngine";
import DecisionPanel from "@/components/workspaces/DecisionPanel";
import CodeReviewWorkspace from "@/components/workspaces/CodeReviewWorkspace";
import DesignCanvas from "@/components/workspaces/DesignCanvas";
import CodeEditor from "@/components/workspaces/CodeEditor";
import PitchBuilder from "@/components/workspaces/PitchBuilder";

const DIM_LABELS: Record<string, string> = {
  curiosity: "好奇心",
  reliability: "靠谱",
  factChecking: "事实洁癖",
  diverseThinking: "多元化思维",
  uncertaintyTolerance: "忍受不确定性",
  lowEgoHighDrive: "低ego高自驱",
};

const DIM_ICONS: Record<string, string> = {
  curiosity: "bi-search",
  reliability: "bi-shield-check",
  factChecking: "bi-clipboard-check",
  diverseThinking: "bi-palette",
  uncertaintyTolerance: "bi-cloud-fog",
  lowEgoHighDrive: "bi-rocket-takeoff",
};

const DIM_DESCRIPTIONS: Record<string, string> = {
  curiosity: "对新知识、新领域的探索欲望，主动提问并深入追问",
  reliability: "做事靠谱，承诺的事情能按时交付且质量稳定",
  factChecking: "不轻信信息，习惯溯源验证、用数据说话",
  diverseThinking: "能从多角度分析问题，包容不同观点，提出创新方案",
  uncertaintyTolerance: "面对模糊和不确定的情况不焦虑，能快速试错、从容应对",
  lowEgoHighDrive: "虚心接受反馈，不被自尊心阻碍，持续精进、目标导向",
};

const EVENT_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  briefing: { label: '任务简报', icon: 'bi-clipboard-plus', color: '#c96442' },
  crisis: { label: '突发事件', icon: 'bi-exclamation-triangle', color: '#dc2626' },
  'review-request': { label: '评审请求', icon: 'bi-clipboard-check', color: '#4a8c6f' },
  deadline: { label: '截止时间', icon: 'bi-clock', color: '#d97706' },
  stakeholder: { label: '利益相关方', icon: 'bi-people', color: '#8b6fc0' },
};

export default function TrialSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const profileId = user?.id || "";

  const [trialData, setTrialData] = useState<TrialData | null>(null);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({
    curiosity: 50,
    reliability: 50,
    factChecking: 50,
    diverseThinking: 50,
    uncertaintyTolerance: 50,
    lowEgoHighDrive: 50,
  });
  const [actions, setActions] = useState<any[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const scenarios = id ? getTrialScenarios(id) : [];
  const currentScenario = scenarios[currentScenarioIndex];
  const isLastScenario = currentScenarioIndex >= scenarios.length - 1;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getTrial(id).then((res: any) => {
      if (!cancelled) setTrialData(res.data || res);
    }).catch(() => {});

    // 创建 session
    import("@/api/client").then(({ startTrial }) => {
      startTrial(id).then((res: any) => {
        if (cancelled) return;
        const data = res.data || res;
        if (data.sessionId) setSessionId(data.sessionId);
      }).catch(() => {});
    });

    return () => { cancelled = true; };
  }, [id]);

  // AI 静默评估 — 每次用户提交动作后更新分数
  const evaluateAction = (scenario: ScenarioEvent, actionData: any) => {
    const action = {
      scenarioId: scenario.id,
      type: scenario.workspace,
      focusDimensions: scenario.focusDimensions,
      data: actionData,
      timestamp: Date.now(),
    };
    setActions((prev) => [...prev, action]);

    // 基于行为数据更新分数（EMA 风格）
    // 每个动作根据其场景配置的 focusDimensions 和行为质量调整分数
    const newScores = { ...scores };
    const EMA_ALPHA = 0.3;

    scenario.focusDimensions.forEach((dim) => {
      // 基础分：完成动作即有基础分
      let qualityScore = 60;

      // 根据动作类型计算质量分
      if (actionData.weight !== undefined) {
        // 决策类：weight 越高质量越好（1-5 分映射到 40-90）
        qualityScore = 40 + (actionData.weight / 5) * 50;
      } else if (actionData.findings) {
        // 代码审查类：发现的问题越多质量越高
        qualityScore = Math.min(90, 40 + actionData.findings.length * 10);
      } else if (actionData.code) {
        // 代码类：代码长度和修改程度
        const codeLen = actionData.code.length;
        qualityScore = Math.min(85, 50 + Math.min(35, codeLen / 50));
      } else if (actionData.placedComponents) {
        // 设计类：组件数量和连接数
        const compScore = actionData.placedComponents.length * 5;
        const connScore = (actionData.connections?.length || 0) * 3;
        qualityScore = Math.min(90, 45 + compScore + connScore);
      } else if (actionData.sections) {
        // 路演类：内容丰富度
        const totalWords = Object.values(actionData.sections).reduce(
          (sum: number, text: any) => sum + String(text).split(/\s+/).filter(Boolean).length, 0
        ) as number;
        qualityScore = Math.min(88, 45 + totalWords / 3);
      }

      newScores[dim] = Math.round(EMA_ALPHA * qualityScore + (1 - EMA_ALPHA) * newScores[dim]);
    });

    setScores(newScores);
  };

  const handleActionSubmit = (actionData: any) => {
    if (!currentScenario) return;
    evaluateAction(currentScenario, actionData);

    // 如果有分支，根据选择决定下一个场景
    if (actionData.optionId && currentScenario.workspaceConfig.type === 'decision') {
      const branches = (currentScenario.workspaceConfig as any).branches;
      if (branches && branches[actionData.optionId]) {
        // 找到分支目标的索引
        const branchId = branches[actionData.optionId];
        const branchIndex = scenarios.findIndex((s) => s.id === branchId);
        if (branchIndex >= 0) {
          setTimeout(() => setCurrentScenarioIndex(branchIndex), 800);
          return;
        }
      }
    }

    // 正常进入下一个场景
    if (!isLastScenario) {
      setTimeout(() => setCurrentScenarioIndex((i) => i + 1), 800);
    }
  };

  const handleSubmit = async () => {
    if (submitting || !sessionId) return;
    setSubmitting(true);
    try {
      const { submitEvaluation } = await import("@/api/client");
      const result = await submitEvaluation({ sessionId, trialId: id });
      setEvaluation(result);
    } catch (err: any) {
      // API 失败时显示错误，不再静默使用假数据
      setSubmitError(err?.message || '评估提交失败，请检查网络或稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (!trialData || !currentScenario) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f5f4ed" }}>
        <motion.div
          className="w-12 h-12 rounded-full border-4 border-[#e8e6dc]"
          style={{ borderTopColor: "#c96442" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  // 渲染当前工作区
  const renderWorkspace = (scenario: ScenarioEvent) => {
    const config = scenario.workspaceConfig;
    switch (config.type) {
      case 'decision':
        return <DecisionPanel config={config} onSubmit={(optionId, option) => handleActionSubmit({ optionId, weight: option.weight, label: option.label })} />
      case 'code-review':
        return <CodeReviewWorkspace config={config} onSubmit={(findings) => handleActionSubmit({ findings })} />
      case 'design':
        return <DesignCanvas config={config} onSubmit={(placedComponents, connections) => handleActionSubmit({ placedComponents, connections })} />
      case 'code-edit':
        return <CodeEditor config={config} onSubmit={(code) => handleActionSubmit({ code })} />
      case 'pitch':
        return <PitchBuilder config={config} onSubmit={(sections) => handleActionSubmit({ sections })} />
      default:
        return <div>未知工作区类型</div>
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#f5f4ed", fontFamily: "'DM Sans', sans-serif" }}>
      {/* ── 顶部导航 ── */}
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex items-center justify-between px-5 py-3 z-40"
        style={{ background: "rgba(250,249,245,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(232,230,220,0.6)" }}
      >
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.1, x: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate("/trials")}
            className="p-1.5 rounded-lg hover:bg-[#e8e6dc] transition-colors"
          >
            <ArrowLeft size={18} style={{ color: "#5e5d59" }} />
          </motion.button>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #c96442, #d97757)" }}>
            <Trophy size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[#141413] leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>{trialData.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-[#87867f]">{actions.length} 个行为已采集</span>
              <span className="text-[10px] text-[#87867f]">·</span>
              <span className="text-[10px] text-[#87867f]">场景 {currentScenarioIndex + 1}/{scenarios.length}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowPanel(!showPanel)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{
              background: showPanel ? "rgba(201,100,66,0.12)" : "transparent",
              color: showPanel ? "#c96442" : "#5e5d59",
              border: "1px solid rgba(201,100,66,0.2)",
            }}
          >
            <Eye size={12} /> AI 观察面板
          </motion.button>
        </div>
      </motion.div>

      {/* ── 场景进度条 ── */}
      <div className="px-5 py-2 border-b" style={{ borderColor: "rgba(232,230,220,0.6)", background: "rgba(250,249,245,0.5)" }}>
        <div className="max-w-3xl mx-auto flex items-center gap-1">
          {scenarios.map((s, i) => {
            const meta = EVENT_TYPE_META[s.type] || EVENT_TYPE_META.briefing;
            const isCompleted = i < currentScenarioIndex;
            const isCurrent = i === currentScenarioIndex;
            return (
              <div key={s.id} className="flex items-center gap-1 flex-1">
                <div className="flex items-center gap-1.5 flex-1">
                  <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] flex-1"
                    style={{
                      background: isCompleted ? 'rgba(74,140,111,0.08)' : isCurrent ? `${meta.color}15` : 'transparent',
                      border: `1px solid ${isCompleted ? 'rgba(74,140,111,0.2)' : isCurrent ? `${meta.color}40` : 'rgba(232,230,220,0.6)'}`,
                      color: isCompleted ? '#4a8c6f' : isCurrent ? meta.color : '#c4c3bd',
                    }}
                  >
                    {isCompleted ? <CheckCircle2 size={10} /> : <span className="w-2 h-2 rounded-full" style={{ background: isCurrent ? meta.color : '#c4c3bd' }} />}
                    <span className="truncate">{s.title}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 主工作区 ── */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentScenario.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                {/* 场景卡片 */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                      style={{
                        background: `${EVENT_TYPE_META[currentScenario.type].color}15`,
                        color: EVENT_TYPE_META[currentScenario.type].color,
                      }}
                    >
                      <i className={`bi ${EVENT_TYPE_META[currentScenario.type].icon}`} /> {EVENT_TYPE_META[currentScenario.type].label}
                    </span>
                    <span className="text-[10px]" style={{ color: "#c4c3bd" }}>
                      评估维度：{currentScenario.focusDimensions.map((d) => DIM_LABELS[d]).join(' · ')}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif", color: "#141413" }}>
                    {currentScenario.title}
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: "#5e5d59" }}>
                    {currentScenario.description}
                  </p>
                </div>

                {/* 工作区 */}
                {renderWorkspace(currentScenario)}

                {/* 最后一个场景完成后显示提交 */}
                {isLastScenario && actions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 rounded-2xl p-6"
                    style={{
                      background: "linear-gradient(135deg, rgba(201,100,66,0.06), rgba(217,119,87,0.04))",
                      border: "1px solid rgba(201,100,66,0.2)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Award size={20} style={{ color: "#c96442" }} />
                      <h3 className="text-lg font-bold" style={{ color: "#141413" }}>所有场景已完成</h3>
                    </div>
                    <p className="text-sm mb-4" style={{ color: "#5e5d59" }}>
                      AI 已采集你在 {actions.length} 个场景中的行为数据。提交后将生成最终能力评估。
                    </p>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                      style={{ background: "linear-gradient(135deg, #c96442, #d97757)" }}
                    >
                      {submitting ? "生成评估中..." : "提交评估"} <ChevronRight size={16} />
                    </button>
                    {submitError && (
                      <div className="mt-3 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}>
                        {submitError}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 评估结果 */}
                {evaluation && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-6 rounded-2xl p-6"
                    style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(232,230,220,0.8)" }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 size={20} style={{ color: "#4a8c6f" }} />
                      <h3 className="text-lg font-bold" style={{ color: "#141413" }}>评估完成</h3>
                      {evaluation.certification?.level && (
                        <span className="ml-2 px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: "#c96442" }}>
                          {evaluation.certification.level}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {evaluation.portrait && Object.entries(evaluation.portrait).map(([key, val]: [string, any]) => (
                        <div key={key} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.6)" }}>
                          <i className={`bi ${DIM_ICONS[key]}`} style={{ fontSize: 16, color: "#c96442" }} />
                          <div className="text-[10px] mb-1" style={{ color: "#5e5d59" }}>{DIM_LABELS[key]}</div>
                          <div className="text-2xl font-bold" style={{ color: "#c96442" }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    {/* AI 评估报告：亮点 + 改进建议 */}
                    {evaluation.report && (
                      <div className="mb-4 space-y-3">
                        {evaluation.report.summary && (
                          <p className="text-sm" style={{ color: "#5e5d59" }}>{evaluation.report.summary}</p>
                        )}
                        {evaluation.report.strengths?.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold mb-1.5" style={{ color: "#4a8c6f" }}>亮点</div>
                            <ul className="space-y-1">
                              {evaluation.report.strengths.map((s: string, i: number) => (
                                <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: "#5e5d59" }}>
                                  <span style={{ color: "#4a8c6f" }}>+</span> {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {evaluation.report.improvements?.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold mb-1.5" style={{ color: "#c96442" }}>改进建议</div>
                            <ul className="space-y-1">
                              {evaluation.report.improvements.map((s: string, i: number) => (
                                <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: "#5e5d59" }}>
                                  <span style={{ color: "#c96442" }}>→</span> {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    {/* 未达标时基于六维短板生成建议 */}
                    {evaluation.certification && !evaluation.certification.level && evaluation.portrait && (() => {
                      const sorted = Object.entries(evaluation.portrait).sort((a: any, b: any) => a[1] - b[1]);
                      const weakest = sorted.slice(0, 2);
                      const SUGGESTIONS: Record<string, string> = {
                        curiosity: '在试炼中主动探索更多技术方案，展现对未知领域的好奇心',
                        reliability: '注意任务完成的可靠性和一致性，确保承诺的事项按时交付',
                        factChecking: '加强事实核查习惯，在决策前验证信息来源的可靠性',
                        diverseThinking: '尝试从不同角度分析问题，展现更多元化的思维方式',
                        uncertaintyTolerance: '在不确定的场景中保持冷静，提高对模糊性的容忍度',
                        lowEgoHighDrive: '展现更强的自驱力，主动推进任务而非等待指令',
                      };
                      return (
                        <div className="mb-4">
                          <div className="text-xs font-semibold mb-1.5" style={{ color: "#c96442" }}>提升方向</div>
                          <ul className="space-y-1">
                            {weakest.map(([dim, score]: any) => (
                              <li key={dim} className="text-xs flex items-start gap-1.5" style={{ color: "#5e5d59" }}>
                                <span style={{ color: "#c96442" }}>→</span>
                                <span><b>{DIM_LABELS[dim] || dim}</b>（{score}分）：{SUGGESTIONS[dim] || '继续加强此维度'}</span>
                              </li>
                            ))}
                          </ul>
                          <p className="text-[10px] mt-2" style={{ color: "#87867f" }}>
                            综合分未达 60 分（C1 认证门槛），建议针对薄弱维度加强练习后重新挑战。
                          </p>
                        </div>
                      );
                    })()}
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: "#5e5d59" }}>
                        综合分 <span className="font-bold text-lg" style={{ color: "#c96442" }}>{evaluation.certification?.certScore ?? evaluation.certScore ?? "—"}</span>
                      </span>
                      <button
                        onClick={() => navigate(`/profile/${profileId}`)}
                        className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium text-white"
                        style={{ background: "#c96442" }}
                      >
                        查看画像 <ChevronRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ── AI 观察面板（侧边） ── */}
        <AnimatePresence>
          {showPanel && (
            <motion.aside
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-72 border-l overflow-y-auto flex-shrink-0 hidden md:block"
              style={{ background: "rgba(250,249,245,0.6)", backdropFilter: "blur(12px)", borderColor: "rgba(232,230,220,0.6)" }}
            >
              <div className="p-5 space-y-5">
                {/* AI 观察者 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Eye size={14} style={{ color: "#c96442" }} />
                    <h2 className="text-sm font-semibold" style={{ color: "#141413" }}>AI 静默观察</h2>
                  </div>
                  <div className="rounded-lg p-3" style={{ background: "rgba(201,100,66,0.06)", border: "1px solid rgba(201,100,66,0.15)" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <motion.div
                        className="w-2 h-2 rounded-full"
                        style={{ background: "#c96442" }}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <span className="text-[10px] font-medium" style={{ color: "#c96442" }}>正在观察</span>
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: "#5e5d59" }}>
                      {currentScenario.observerHint}
                    </p>
                  </div>
                </div>

                {/* 已采集行为 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={14} style={{ color: "#c96442" }} />
                    <h3 className="text-xs font-semibold" style={{ color: "#141413" }}>行为日志</h3>
                  </div>
                  {actions.length === 0 ? (
                    <p className="text-[10px]" style={{ color: "#c4c3bd" }}>等待第一次操作...</p>
                  ) : (
                    <div className="space-y-1.5">
                      {actions.map((a, i) => (
                        <div key={i} className="rounded-lg p-2" style={{ background: "rgba(255,255,255,0.5)" }}>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 size={10} style={{ color: "#4a8c6f" }} />
                            <span className="text-[10px] font-medium" style={{ color: "#5e5d59" }}>
                              {a.type === 'decision' ? '决策' : a.type === 'code-review' ? '审查' : a.type === 'design' ? '设计' : a.type === 'code-edit' ? '编码' : '路演'}
                            </span>
                          </div>
                          <p className="text-[9px] mt-0.5" style={{ color: "#87867f" }}>
                            {a.focusDimensions.map((d: string) => DIM_LABELS[d]).join(' · ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 实时能力分数 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={14} style={{ color: "#c96442" }} />
                    <h3 className="text-xs font-semibold" style={{ color: "#141413" }}>实时能力</h3>
                  </div>
                  <div className="space-y-2.5">
                    {Object.entries(scores).map(([key, val]) => (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] flex items-center gap-1" style={{ color: "#5e5d59" }} title={DIM_DESCRIPTIONS[key]}>
                            <i className={`bi ${DIM_ICONS[key]}`} style={{ fontSize: 10, color: "#c96442" }} />
                            {DIM_LABELS[key]}
                          </span>
                          <span className="text-xs font-bold" style={{ color: val >= 70 ? "#4a8c6f" : val >= 50 ? "#c96442" : "#87867f" }}>
                            {val}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#e8e6dc" }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: val >= 70 ? "linear-gradient(90deg, #4a8c6f, #6dbf8e)" : "linear-gradient(90deg, #c96442, #d97757)" }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, val)}%` }}
                            transition={{ duration: 0.6 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] mt-3" style={{ color: "#87867f" }}>
                    分数基于你在各场景中的真实行为数据，非主观评价
                  </p>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
