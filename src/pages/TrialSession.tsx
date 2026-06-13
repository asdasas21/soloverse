import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Send, Clock, Trophy, ArrowLeft, PanelRightOpen, PanelRightClose } from "lucide-react";
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
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full bg-[#87867f]"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

export default function TrialSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const trial = TRIALS.find((t) => t.id === id);
  const {
    currentMessages, isTyping, addMessage, setTyping,
    trialSessions, initSession,
  } = useTrialStore();
  const [input, setInput] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyIndexRef = useRef(0);

  useEffect(() => {
    if (id) initSession(id);
  }, [id, initSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages, streamingText]);

  const simulateStream = useCallback((text: string) => {
    setTyping(true);
    setStreamingText("");
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setStreamingText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setStreamingText("");
        setTyping(false);
        addMessage("agent", text);
      }
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

  useEffect(() => {
    const t = setInterval(() => setTimer((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  if (!trial) {
    return (
      <div className="min-h-screen bg-[#f5f4ed] flex items-center justify-center">
        <p className="text-[#5e5d59]">试炼未找到</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#f5f4ed]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e6dc] bg-[#faf9f5]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/trials")} className="text-[#5e5d59] hover:text-[#141413]">
            <ArrowLeft size={20} />
          </button>
          <Trophy size={20} style={{ color: "#c96442" }} />
          <h1 className="text-lg font-semibold text-[#141413]" style={{ fontFamily: "'Playfair Display', serif" }}>
            {trial.title}
          </h1>
        </div>
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="text-[#5e5d59] hover:text-[#141413] md:hidden"
        >
          {showSidebar ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            <AnimatePresence>
              {currentMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#e8e6dc] text-[#141413] rounded-br-md"
                        : "bg-white text-[#141413] border border-[#e8e6dc] rounded-bl-md"
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isTyping && streamingText && (
              <div className="flex justify-start">
                <div className="max-w-[75%] px-4 py-3 rounded-2xl rounded-bl-md text-sm leading-relaxed bg-white text-[#141413] border border-[#e8e6dc]">
                  {streamingText}
                </div>
              </div>
            )}
            {isTyping && !streamingText && (
              <div className="flex justify-start">
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
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="输入消息..."
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#e8e6dc] bg-white text-sm text-[#141413] placeholder:text-[#87867f] outline-none focus:border-[#c96442] transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={isTyping || !input.trim()}
                className="p-2.5 rounded-lg text-white transition-colors disabled:opacity-40"
                style={{ background: "#c96442" }}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="hidden md:block border-l border-[#e8e6dc] bg-[#faf9f5] overflow-hidden"
            >
              <div className="p-5 space-y-6 w-[320px]">
                <div>
                  <h2 className="text-sm font-semibold text-[#141413] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {trial.title}
                  </h2>
                  <p className="text-xs text-[#5e5d59] leading-relaxed">{trial.description}</p>
                </div>

                {/* Progress */}
                <div>
                  <h3 className="text-xs font-medium text-[#87867f] mb-3">试炼进度</h3>
                  <div className="flex items-center gap-1">
                    {steps.map((step, i) => (
                      <div key={step} className="flex items-center gap-1 flex-1">
                        <div className="flex flex-col items-center flex-1">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
                              i <= currentStep
                                ? "bg-[#c96442] text-white"
                                : "bg-[#e8e6dc] text-[#87867f]"
                            }`}
                          >
                            {i + 1}
                          </div>
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
                <div className="flex items-center gap-2 text-sm text-[#5e5d59]">
                  <Clock size={16} />
                  <span className="font-mono">{formatTime(timer)}</span>
                </div>

                {/* Submit */}
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
