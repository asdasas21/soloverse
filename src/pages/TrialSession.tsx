import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Send, Clock, Trophy, ArrowLeft, PanelRightOpen, PanelRightClose, Bot, Menu, X } from "lucide-react";
import { useTrialStore, TRIALS } from "@/store/trialStore";

const AGENT_REPLIES = [
  "很好！让我们开始吧。首先，请描述一下你对这个项目的整体架构设计思路。",
  "不错的想法！你能具体说说你会使用哪些技术栈来实现这个功能吗？",
  "理解了。那么关于错误处理和边界情况，你打算怎么应对？",
  "非常好！你的思路很清晰。接下来请开始编码实现吧，我会在一旁观察。",
  "代码质量不错！再考虑一下性能优化方面，有什么可以改进的地方？",
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ background: "#c96442" }}
          animate={{ scale: [0.7, 1.2, 0.7], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function AgentAvatar() {
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#c96442" }}>
      <Bot size={14} className="text-white" />
    </div>
  );
}

function ProgressRing({ current }: { step: number; current: boolean }) {
  const r = 12;
  const circ = 2 * Math.PI * r;
  return (
    <svg width="32" height="32" className="-rotate-90">
      <circle cx="16" cy="16" r={r} fill="none" stroke="#e8e6dc" strokeWidth="2" />
      {current && (
        <motion.circle
          cx="16" cy="16" r={r} fill="none" stroke="#c96442" strokeWidth="2"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function renderInlineCode(text: string) {
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") ? (
      <code key={i} className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: "#f0efe8", color: "#c96442" }}>
        {part.slice(1, -1)}
      </code>
    ) : part
  );
}

export default function TrialSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const trial = TRIALS.find((t) => t.id === id);
  const { currentMessages, isTyping, addMessage, setTyping, trialSessions, initSession } = useTrialStore();
  const [input, setInput] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 768);
  const [inputFocused, setInputFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyIndexRef = useRef(0);

  useEffect(() => { if (id) initSession(id); }, [id, initSession]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [currentMessages, streamingText]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const simulateStream = useCallback((text: string) => {
    setTyping(true); setStreamingText("");
    let i = 0;
    intervalRef.current = setInterval(() => {
      if (i < text.length) { setStreamingText(text.slice(0, i + 1)); i++; }
      else { clearInterval(intervalRef.current!); intervalRef.current = null; setStreamingText(""); setTyping(false); addMessage("agent", text); }
    }, 30);
  }, [addMessage, setTyping]);

  const handleSend = () => {
    if (!input.trim() || isTyping) return;
    addMessage("user", input.trim());
    const reply = AGENT_REPLIES[replyIndexRef.current % AGENT_REPLIES.length];
    replyIndexRef.current++;
    setTimeout(() => simulateStream(reply), 600);
    setInput("");
  };

  const session = id ? trialSessions[id] : null;
  const steps = session?.steps ?? ["开始", "编码中", "提交", "评审"];
  const currentStep = session?.currentStep ?? 0;
  const elapsed = session ? Math.floor((Date.now() - session.startedAt) / 1000) : 0;
  const [timer, setTimer] = useState(elapsed);
  useEffect(() => { const t = setInterval(() => setTimer((v) => v + 1), 1000); return () => clearInterval(t); }, []);
  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  if (!trial) {
    return <div className="min-h-screen bg-[#f5f4ed] flex items-center justify-center"><p className="text-[#5e5d59]">试炼未找到</p></div>;
  }

  return (
    <div className="h-screen flex flex-col bg-[#f5f4ed]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e6dc] bg-[#faf9f5]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/trials")} className="text-[#5e5d59] hover:text-[#141413]"><ArrowLeft size={20} /></button>
          <Trophy size={20} style={{ color: "#c96442" }} />
          <h1 className="text-lg font-semibold text-[#141413]" style={{ fontFamily: "'Playfair Display', serif" }}>{trial.title}</h1>
        </div>
        <button onClick={() => setShowSidebar(!showSidebar)} className="text-[#5e5d59] hover:text-[#141413]">
          {showSidebar ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Chat Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            <AnimatePresence mode="popLayout">
              {currentMessages.map((msg) => (
                <motion.div
                  key={msg.id} layout
                  initial={{ opacity: 0, x: msg.role === "user" ? 40 : -40, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "agent" && <AgentAvatar />}
                  <div
                    className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#e8e6dc] text-[#141413] rounded-br-md"
                        : "bg-white text-[#141413] border border-[#e8e6dc] rounded-bl-md"
                    }`}
                  >
                    {renderInlineCode(msg.content)}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isTyping && streamingText && (
              <div className="flex justify-start gap-2">
                <AgentAvatar />
                <div className="max-w-[75%] px-4 py-3 rounded-2xl rounded-bl-md text-sm leading-relaxed bg-white text-[#141413] border border-[#e8e6dc]">
                  {streamingText}
                </div>
              </div>
            )}
            {isTyping && !streamingText && (
              <div className="flex justify-start gap-2">
                <AgentAvatar />
                <div className="bg-white border border-[#e8e6dc] rounded-2xl rounded-bl-md">
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-[#e8e6dc] bg-[#faf9f5]">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)}
                  placeholder="输入消息..."
                  className="w-full px-4 py-2.5 rounded-lg border bg-white text-sm text-[#141413] placeholder:text-[#87867f] outline-none transition-all duration-200"
                  style={{ borderColor: inputFocused ? "#c96442" : "#e8e6dc", boxShadow: inputFocused ? "0 0 0 3px rgba(201,100,66,0.15)" : "none" }}
                />
              </div>
              <motion.button
                onClick={handleSend} disabled={isTyping || !input.trim()}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="p-2.5 rounded-lg text-white transition-colors disabled:opacity-40"
                style={{ background: "#c96442" }}
              >
                <Send size={18} />
              </motion.button>
            </div>
            <p className="text-[10px] text-[#87867f] mt-1.5 text-right">按 Enter 发送</p>
          </div>
        </div>

        {/* Mobile sidebar toggle */}
        <AnimatePresence>
          {!showSidebar && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setShowSidebar(true)}
              className="md:hidden fixed bottom-24 right-4 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white"
              style={{ background: "#c96442" }}
            >
              <Menu size={20} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              className="border-l border-[#e8e6dc] overflow-hidden flex-shrink-0"
              style={{ background: "linear-gradient(180deg, #faf9f5 0%, #f0efe8 100%)" }}
            >
              <div className="p-5 space-y-6 w-[320px]">
                <div className="flex items-center justify-between md:hidden">
                  <span className="text-sm font-medium text-[#141413]">详情</span>
                  <button onClick={() => setShowSidebar(false)} className="text-[#5e5d59]"><X size={18} /></button>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#141413] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>{trial.title}</h2>
                  <p className="text-xs text-[#5e5d59] leading-relaxed">{trial.description}</p>
                </div>

                {/* Progress with rings */}
                <div>
                  <h3 className="text-xs font-medium text-[#87867f] mb-3">试炼进度</h3>
                  <div className="flex items-center gap-1">
                    {steps.map((step, i) => (
                      <div key={step} className="flex items-center gap-1 flex-1">
                        <div className="flex flex-col items-center flex-1 relative">
                          <ProgressRing step={i} current={i === currentStep} />
                          <span className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-medium ${i <= currentStep ? "text-[#c96442]" : "text-[#87867f]"}`}>
                            {i + 1}
                          </span>
                          <span className="text-[10px] text-[#87867f] mt-1">{step}</span>
                        </div>
                        {i < steps.length - 1 && (
                          <div className={`h-0.5 flex-1 -mt-4 ${i < currentStep ? "bg-[#c96442]" : "bg-[#e8e6dc]"}`} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timer */}
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: "rgba(201,100,66,0.08)" }}>
                  <Clock size={18} style={{ color: "#c96442" }} />
                  <span className="font-mono text-lg font-semibold text-[#141413]">{formatTime(timer)}</span>
                </div>

                <button
                  className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ background: "#c96442" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#d97757")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#c96442")}
                >
                  提交代码
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
