import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DEMO_GREETING = '你好！我是 TalentX 的 AI 导师。想体验一下试炼的感觉吗？问我一个技术问题试试，比如"如何设计一个高并发系统？"';

export function DemoChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<{ role: 'user' | 'agent'; content: string }[]>([
    { role: 'agent', content: DEMO_GREETING },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'demo-session',
          message: userMsg,
          guestMode: true,
        }),
      });

      if (!res.ok) throw new Error();
      const reader = res.body?.getReader();
      if (!reader) throw new Error();
      const decoder = new TextDecoder();
      let agentText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('event: token')) {
            // Next line should have data
          }
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.token) {
                agentText += data.token;
                setMessages((m) => {
                  const last = m[m.length - 1];
                  if (last?.role === 'agent' && last.content !== DEMO_GREETING) {
                    return [...m.slice(0, -1), { role: 'agent', content: agentText }];
                  }
                  return [...m, { role: 'agent', content: agentText }];
                });
              }
            } catch { /* SSE parse skip */ }
          }
        }
      }

      if (!agentText) {
        setMessages((m) => [...m, { role: 'agent', content: '这是一个不错的问题！注册后可以体验完整的试炼流程，AI 导师会根据你的回答进行深度评估。' }]);
      }

      setHasInteracted(true);
    } catch {
      setMessages((m) => [...m, { role: 'agent', content: '体验服务暂时繁忙。注册登录后可以体验完整的 AI 试炼流程！' }]);
      setHasInteracted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border p-5" style={{ background: '#faf9f5', borderColor: '#e8e6dc' }}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={18} style={{ color: '#c96442' }} />
        <h3 className="text-base font-semibold" style={{ color: '#141413' }}>免费体验 AI 试炼</h3>
      </div>

      {/* Chat messages */}
      <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === 'user' ? 'text-white' : ''
              }`}
              style={{
                background: m.role === 'user' ? '#c96442' : '#f0eee5',
                color: m.role === 'user' ? '#fff' : '#141413',
              }}
            >
              {m.content}
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#f0eee5', color: '#87867f' }}>
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Register CTA after interaction */}
      {hasInteracted && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-3 rounded-lg px-4 py-3 text-center"
          style={{ background: 'rgba(201,100,66,0.08)' }}
        >
          <p className="text-sm mb-2" style={{ color: '#141413' }}>感觉如何？注册后解锁完整试炼，获取能力画像和认证证书</p>
          <button
            onClick={() => navigate('/auth')}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: '#c96442' }}
          >
            免费注册
          </button>
        </motion.div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="输入你的问题..."
          className="flex-1 rounded-lg px-3.5 py-2.5 text-sm outline-none border"
          style={{ background: '#fff', borderColor: '#e8e6dc', color: '#141413' }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="rounded-lg px-3 py-2.5 text-white disabled:opacity-40"
          style={{ background: '#c96442' }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
