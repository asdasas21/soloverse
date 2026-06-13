import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Award, Printer, Share2 } from 'lucide-react';

const CERT_ID = 'TX-2026-C2-00421';
const ISSUE_DATE = '2026年5月28日';

function Confetti() {
  const particles = useMemo(() =>
    Array.from({ length: 25 }, (_, i) => {
      const left = Math.random() * 100;
      const delay = Math.random() * 0.6;
      const size = 4 + Math.random() * 6;
      const hue = Math.random() > 0.5 ? '16, 57%, 50%' : '24, 50%, 57%';
      return { left, delay, size, hue, i };
    }), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 10 }}>
      {particles.map((p) => (
        <div
          key={p.i}
          className="confetti-particle"
          style={{
            left: `${p.left}%`,
            bottom: '30%',
            width: p.size,
            height: p.size,
            background: `hsl(${p.hue})`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function Certificate() {
  const [toast, setToast] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      await navigator.clipboard.writeText(window.location.href);
    }
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
      <Confetti />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
        className="w-full max-w-lg"
      >
        {/* Certificate Card */}
        <div
          className="relative rounded-2xl p-8 sm:p-10 overflow-hidden cert-card"
          style={{
            background: 'var(--color-card)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0px 0px 0px 1px rgba(0,0,0,0.06)',
          }}
        >
          {/* Animated rotating border */}
          <div className="absolute inset-0 rounded-2xl pointer-events-none cert-border" />

          {/* Noise/grain texture overlay */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat',
              backgroundSize: '128px 128px',
            }}
          />

          {/* Content */}
          <div className="relative text-center">
            {/* Top decoration */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="flex justify-center mb-6"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(201,100,66,0.12)' }}
              >
                <Award size={32} style={{ color: 'var(--color-brand)' }} />
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-2xl font-bold mb-1"
              style={{ fontFamily: "'Playfair Display', serif", color: 'var(--color-text)' }}
            >
              TalentX 能力认证
            </motion.h1>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.7, duration: 0.4 }}
              className="h-px w-16 mx-auto my-4"
              style={{ background: 'var(--color-border)' }}
            />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.75 }}
              className="text-sm mb-1"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              兹证明
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="text-3xl font-bold mb-4"
              style={{ fontFamily: "'Playfair Display', serif", color: 'var(--color-text)' }}
            >
              张三
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.85 }}
              className="text-sm mb-6"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              通过 TalentX 六维能力评估体系认证，达到
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9, type: 'spring', stiffness: 200, damping: 15 }}
              className="mb-6"
            >
              <span
                className="inline-block text-4xl font-bold px-6 py-2 rounded-lg"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: 'var(--color-brand)',
                  background: 'rgba(201,100,66,0.08)',
                }}
              >
                C2 专业级
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
              className="flex justify-between items-end text-xs"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              <div className="text-left">
                <div>签发日期：{ISSUE_DATE}</div>
                <div className="mt-1 font-mono">编号：{CERT_ID}</div>
              </div>
              <div className="text-right">
                <div className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>TalentX 认证委员会</div>
                <div className="mt-1">数字签名 ✓</div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="flex justify-center gap-3 mt-6"
        >
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: 'var(--color-card)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            <Printer size={16} /> 打印证书
          </button>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--color-brand)', color: '#fff' }}
          >
            <Share2 size={16} /> 分享
          </button>
        </motion.div>

        {/* Toast */}
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center mt-4 text-sm font-medium"
            style={{ color: 'var(--color-brand)' }}
          >
            已复制链接
          </motion.div>
        )}
      </motion.div>

      <style>{`
        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes rotate-border {
          to { --angle: 360deg; }
        }
        .cert-border {
          border: 2.5px solid transparent;
          background: linear-gradient(var(--color-card), var(--color-card)) padding-box,
                      conic-gradient(from var(--angle), #c96442, #d97757, #f5e6d0, #d97757, #c96442) border-box;
          animation: rotate-border 4s linear infinite;
          border-radius: 1rem;
        }
        @keyframes confetti-rise {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-120px) rotate(360deg); opacity: 0; }
        }
        .confetti-particle {
          position: absolute;
          border-radius: 50%;
          animation: confetti-rise 1.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
