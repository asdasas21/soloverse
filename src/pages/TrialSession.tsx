import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useSpring } from "motion/react";
import { Send, Clock, Trophy, ArrowLeft, Bot, Award, ChevronRight, Sparkles, Zap, TrendingUp } from "lucide-react";
import { useTrialStore } from "@/store/trialStore";
import { startTrial, submitEvaluation, getTrial, type TrialData } from "@/api/client";
import { useAuthStore } from "@/store/authStore";

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

// ── 顶部进度条 ──
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] origin-left z-50"
      style={{ scaleX, background: "linear-gradient(90deg, #c96442, #d97757, #e8a87c)" }}
    />
  );
}

// ── AI 思考动画 ──
function ThinkingOrb() {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="relative w-10 h-10">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(201,100,66,0.3), transparent 70%)" }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-2 rounded-full"
          style={{ background: "#c96442" }}
          animate={{ scale: [0.8, 1, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1 h-1 rounded-full bg-[#c96442]"
            animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}

// ── 富文本渲染 ──
function RichText({ text }: { text: string }) {
  const parts = text.split(/(```[\s\S]*?```|`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const code = part.slice(3, -3).replace(/^\w+\n/, "");
          return (
            <pre key={i} className="my-2 p-3 rounded-lg overflow-x-auto text-xs font-mono" style={{ background: "#1a1a2e", color: "#e0e0e0" }}>
              <code>{code}</code>
            </pre>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={i} className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: "rgba(201,100,66,0.1)", color: "#c96442" }}>{part.slice(1, -1)}</code>;
        }
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ── 浮动能力指标 ──
function FloatingScoreCard({ scores }: { scores: Record<string, number> }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-2.5"
    >
      {Object.entries(scores).map(([key, val], i) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs flex items-center gap-1" style={{ color: "#5e5d59" }}>
              <i className={`bi ${DIM_ICONS[key]}`} style={{ fontSize: "12px" }} />
              {DIM_LABELS[key] || key}
            </span>
            <motion.span
              className="text-sm font-bold"
              style={{ color: val >= 70 ? "#4a8c6f" : val >= 50 ? "#c96442" : "#87867f" }}
              key={val}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              {val}
            </motion.span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden relative" style={{ background: "#e8e6dc" }}>
            <motion.div
              className="h-full rounded-full relative"
              style={{
                background: val >= 70 ? "linear-gradient(90deg, #4a8c6f, #6dbf8e)" : "linear-gradient(90deg, #c96442, #d97757)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, val)}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <motion.div
                className="absolute inset-0"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)" }}
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

export default function TrialSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const profileId = user?.id || "";
  const [trialData, setTrialData] = useState<TrialData | null>(null);
  const { currentMessages, isTyping, addMessage, setMessages, clearMessages, setTyping } = useTrialStore();
  const [input, setInput] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [showPanel, setShowPanel] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [liveScores, setLiveScores] = useState<Record<string, number> | null>(null);
  const [turnCount, setTurnCount] = useState(0);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    clearMessages();
    getTrial(id).then((res: any) => { if (!cancelled) setTrialData(res.data || res); }).catch(() => {});
    let retries = 0;
    const attemptStart = () => {
      startTrial(id).then((res: any) => {
        if (cancelled) return;
        const data = res.data || res;
        if (data.sessionId) {
          setSessionId(data.sessionId);
          if (data.messages?.length > 0) {
            const restored = data.messages.map((m: any, i: number) => ({
              id: `restored-${i}`,
              role: m.role === "assistant" ? "agent" : m.role,
              content: m.content,
              timestamp: Date.now() - (data.messages.length - i) * 60000,
            }));
            setMessages(restored);
            setTurnCount(data.turnCount || restored.filter((m: any) => m.role === "user").length);
          } else if (data.greeting) {
            addMessage("agent", data.greeting);
          }
        }
      }).catch(() => { if (!cancelled && retries < 3) { retries++; setTimeout(attemptStart, 1000 * retries); } });
    };
    attemptStart();
    return () => { cancelled = true; };
  }, [id]);

  const sendChatMessage = useCallback(async (message: string) => {
    if (!sessionId) { addMessage("agent", "正在建立连接，请稍等片刻再试..."); return; }
    setTyping(true);
    setStreamingText("");
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const uid = localStorage.getItem("talentx_user_id") || "";
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(uid ? { "x-user-id": uid } : {}),
        },
        body: JSON.stringify({ sessionId, message }),
      });
      const reader = res.body?.getReader();
      if (!reader) { setTyping(false); return; }
      const decoder = new TextDecoder();
      let agentMessage = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "token" || data.token) {
                agentMessage += data.content || data.token;
                setStreamingText(agentMessage);
              } else if (data.type === "evaluation") {
                const { type: _t, ...scores } = data;
                void _t;
                setLiveScores(scores);
                setShowPanel(true);
              } else if (data.type === "done") {
                setStreamingText("");
                setTyping(false);
                if (agentMessage) addMessage("agent", agentMessage);
                setTurnCount((c) => c + 1);
              }
            } catch { /* SSE parse skip */ }
          }
        }
      }
      if (agentMessage && isTyping) {
        setStreamingText(""); setTyping(false);
        addMessage("agent", agentMessage);
        setTurnCount((c) => c + 1);
      }
    } catch {
      setStreamingText(""); setTyping(false);
      addMessage("agent", "连接出现问题，请重试。");
    }
  }, [sessionId, addMessage, setTyping, isTyping]);

  const handleSend = () => {
    if (!input.trim() || isTyping || submitSuccess) return;
    const msg = input.trim();
    addMessage("user", msg);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    sendChatMessage(msg);
  };

  const handleSubmit = async () => {
    if (submitting || !sessionId) return;
    setSubmitting(true);
    try {
      const result = await submitEvaluation({ sessionId, trialId: id });
      setEvaluation(result.data || result);
      setSubmitSuccess(true);
    } catch {
      addMessage("agent", "提交失败，请重试。");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [currentMessages, streamingText]);

  const [timer, setTimer] = useState(0);
  useEffect(() => { const t = setInterval(() => setTimer((v) => v + 1), 1000); return () => clearInterval(t); }, []);
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  if (!trialData) {
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

  // Pair messages: agent message + following user reply
  const pairs: { agent?: typeof currentMessages[0]; user?: typeof currentMessages[0] }[] = [];
  let i = 0;
  while (i < currentMessages.length) {
    if (currentMessages[i].role === "agent") {
      const pair: any = { agent: currentMessages[i] };
      if (i + 1 < currentMessages.length && currentMessages[i + 1].role === "user") {
        pair.user = currentMessages[i + 1];
        i += 2;
      } else {
        i++;
      }
      pairs.push(pair);
    } else {
      pairs.push({ user: currentMessages[i] });
      i++;
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#f5f4ed", fontFamily: "'DM Sans', sans-serif" }}>
      <ScrollProgress />

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
              <span className="flex items-center gap-1 text-[10px] text-[#87867f]">
                <Clock size={10} /> {formatTime(timer)}
              </span>
              <span className="text-[10px] text-[#87867f]">·</span>
              <span className="text-[10px] text-[#87867f]">{turnCount} 轮对话</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 能力面板切换 */}
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
            <Zap size={12} /> 能力面板
          </motion.button>
        </div>
      </motion.div>

      {/* ── 对话区域 ── */}
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

            {/* 背景装饰 */}
            <div className="fixed top-1/4 left-0 w-64 h-64 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(201,100,66,0.04), transparent 70%)", filter: "blur(40px)" }} />
            <div className="fixed bottom-1/4 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(217,119,87,0.03), transparent 70%)", filter: "blur(50px)" }} />

            <AnimatePresence mode="popLayout">
              {pairs.map((pair, idx) => (
                <motion.div
                  key={pair.agent?.id || pair.user?.id || idx}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                >
                  {/* AI 卡片 */}
                  {pair.agent && (
                    <motion.div
                      className="relative rounded-2xl p-5 mb-3"
                      style={{
                        background: "rgba(255,255,255,0.7)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(232,230,220,0.8)",
                        boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
                      }}
                      whileHover={{ y: -2, boxShadow: "0 8px 32px rgba(0,0,0,0.06)" }}
                    >
                      {/* AI 头像 */}
                      <div className="flex items-center gap-2 mb-3">
                        <motion.div
                          className="w-6 h-6 rounded-lg flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, #c96442, #d97757)" }}
                          animate={{ rotate: [0, 3, -3, 0] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <Bot size={12} className="text-white" />
                        </motion.div>
                        <span className="text-xs font-medium" style={{ color: "#87867f" }}>AI 导师</span>
                        <span className="text-[10px] text-[#c4c3bd]">· #{idx + 1}</span>
                      </div>

                      <div className="text-sm leading-relaxed" style={{ color: "#141413" }}>
                        <RichText text={pair.agent.content} />
                      </div>

                      {/* 悬浮序号 */}
                      <div className="absolute -left-2 top-5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "#c96442" }}>
                        {idx + 1}
                      </div>
                    </motion.div>
                  )}

                  {/* 用户回复 — 嵌套引用块 */}
                  {pair.user && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="ml-8 pl-4 py-2 rounded-r-xl mb-2"
                      style={{ borderLeft: "2px solid rgba(201,100,66,0.3)" }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#e8e6dc" }}>
                          <span className="text-[8px]">你</span>
                        </div>
                        <span className="text-[10px] text-[#87867f]">你的回答</span>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: "#3a3a38" }}>{pair.user.content}</p>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* 流式输出中 */}
            {isTyping && streamingText && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative rounded-2xl p-5"
                style={{
                  background: "rgba(255,255,255,0.7)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(232,230,220,0.8)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <motion.div
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #c96442, #d97757)" }}
                    animate={{ rotate: [0, 3, -3, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <Bot size={12} className="text-white" />
                  </motion.div>
                  <span className="text-xs font-medium" style={{ color: "#87867f" }}>正在回复</span>
                </div>
                <div className="text-sm leading-relaxed" style={{ color: "#141413" }}>
                  <RichText text={streamingText} />
                  <motion.span
                    className="inline-block w-0.5 h-4 ml-0.5"
                    style={{ background: "#c96442" }}
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                </div>
              </motion.div>
            )}

            {/* 思考动画 */}
            {isTyping && !streamingText && <ThinkingOrb />}

            {/* 评审结果卡片 */}
            <AnimatePresence>
              {submitSuccess && evaluation && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="rounded-2xl p-6"
                  style={{
                    background: "linear-gradient(135deg, rgba(201,100,66,0.06), rgba(217,119,87,0.04))",
                    border: "1px solid rgba(201,100,66,0.2)",
                    boxShadow: "0 8px 32px rgba(201,100,66,0.08)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 15 }}
                    >
                      <Award size={24} style={{ color: "#c96442" }} />
                    </motion.div>
                    <h3 className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "#141413" }}>评审完成</h3>
                    {evaluation.certification?.level && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                        className="ml-2 px-3 py-1 rounded-full text-xs font-bold text-white"
                        style={{ background: "#c96442" }}
                      >
                        {evaluation.certification.level}
                      </motion.span>
                    )}
                  </div>

                  {evaluation.portrait && (
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {Object.entries(evaluation.portrait).map(([key, val], i) => (
                        <motion.div
                          key={key}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + i * 0.08 }}
                          className="rounded-xl p-3 text-center"
                          style={{ background: "rgba(255,255,255,0.6)" }}
                        >
                          <i className={`bi ${DIM_ICONS[key]}`} style={{ fontSize: "16px", color: "#c96442" }} />
                          <div className="text-[10px] mb-1" style={{ color: "#5e5d59" }}>{DIM_LABELS[key] || key}</div>
                          <motion.div
                            className="text-2xl font-bold"
                            style={{ color: "#c96442" }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3 + i * 0.08, type: "spring", stiffness: 400 }}
                          >
                            {val as number}
                          </motion.div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "#5e5d59" }}>
                      综合分 <span className="font-bold text-lg" style={{ color: "#c96442" }}>{evaluation.certification?.certScore ?? evaluation.certScore ?? "—"}</span>
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.05, x: 2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate(`/profile/${profileId}`)}
                      className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium text-white"
                      style={{ background: "#c96442" }}
                    >
                      查看画像 <ChevronRight size={14} />
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={scrollRef} />
          </div>
        </div>

        {/* ── 悬浮能力面板 ── */}
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
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} style={{ color: "#c96442" }} />
                    <h2 className="text-sm font-semibold" style={{ color: "#141413" }}>试炼概览</h2>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "#5e5d59" }}>{trialData.description}</p>
                </div>

                {/* 评分维度说明 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <i className="bi bi-info-circle" style={{ fontSize: "12px", color: "#c96442" }} />
                    <h3 className="text-xs font-semibold" style={{ color: "#141413" }}>评分维度</h3>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(DIM_LABELS).map(([key, label]) => (
                      <div key={key} className="flex items-center gap-1.5 text-[11px]" style={{ color: "#5e5d59" }}>
                        <i className={`bi ${DIM_ICONS[key]}`} style={{ fontSize: "10px", color: "#c96442" }} />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] mt-2" style={{ color: "#87867f" }}>
                    AI 将从以上 6 个维度实时评估，综合分 ≥ 60 可获得认证
                  </p>
                </div>

                {liveScores ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp size={14} style={{ color: "#c96442" }} />
                      <h3 className="text-xs font-semibold" style={{ color: "#141413" }}>实时能力评估</h3>
                    </div>
                    <FloatingScoreCard scores={liveScores} />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <motion.div
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-xs"
                      style={{ color: "#87867f" }}
                    >
                      开始对话后<br />AI 将实时评估你的能力
                    </motion.div>
                  </div>
                )}

                {evaluation?.certification && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-xl p-4"
                    style={{ background: "rgba(74,140,111,0.08)", border: "1px solid rgba(74,140,111,0.2)" }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Award size={16} style={{ color: "#4a8c6f" }} />
                      <span className="text-sm font-semibold" style={{ color: "#141413" }}>{evaluation.certification.level}</span>
                    </div>
                    <p className="text-xs" style={{ color: "#5e5d59" }}>综合得分 {evaluation.certification.certScore}</p>
                  </motion.div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={submitting || submitSuccess || turnCount < 1}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                  style={{
                    background: submitSuccess ? "#4a8c6f" : "linear-gradient(135deg, #c96442, #d97757)",
                    boxShadow: submitSuccess || turnCount < 1 ? "none" : "0 4px 12px rgba(201,100,66,0.25)",
                  }}
                >
                  {submitting ? "提交中..." : submitSuccess ? <span className="flex items-center justify-center gap-1"><i className="bi bi-check-circle-fill" /> 已完成</span> : turnCount < 1 ? "请先对话" : `提交评审 (${turnCount}轮)`}
                </motion.button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* ── 输入区域 — 悬浮玻璃态 ── */}
      <AnimatePresence>
        {!submitSuccess && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="px-4 pb-4 pt-2"
          >
            <div className="max-w-2xl mx-auto">
              <div
                className="flex items-end gap-2 rounded-2xl p-2 transition-all duration-300"
                style={{
                  background: inputFocused ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)",
                  backdropFilter: "blur(12px)",
                  border: `1px solid ${inputFocused ? "rgba(201,100,66,0.3)" : "rgba(232,230,220,0.8)"}`,
                  boxShadow: inputFocused ? "0 8px 32px rgba(201,100,66,0.1)" : "0 2px 12px rgba(0,0,0,0.03)",
                }}
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="输入你的回答..."
                  rows={1}
                  className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none resize-none"
                  style={{ color: "#141413", minHeight: "40px", maxHeight: "120px" }}
                />
                <motion.button
                  onClick={handleSend}
                  disabled={isTyping || !input.trim()}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  className="p-2.5 rounded-xl text-white disabled:opacity-30 shrink-0"
                  style={{ background: "linear-gradient(135deg, #c96442, #d97757)" }}
                >
                  <Send size={16} />
                </motion.button>
              </div>
              <p className="text-[10px] mt-1.5 text-center" style={{ color: "#c4c3bd" }}>
                Enter 发送 · Shift+Enter 换行
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 移动端提交按钮 */}
      {turnCount >= 1 && !submitSuccess && !showPanel && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleSubmit}
          disabled={submitting}
          className="md:hidden fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white"
          style={{ background: "linear-gradient(135deg, #c96442, #d97757)" }}
        >
          <Trophy size={20} />
        </motion.button>
      )}
    </div>
  );
}
