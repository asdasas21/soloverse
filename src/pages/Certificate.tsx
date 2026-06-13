import { motion } from 'motion/react';
import { Award, Printer, Share2 } from 'lucide-react';

const CERT_ID = 'TX-2026-C2-00421';
const ISSUE_DATE = '2026年5月28日';

export default function Certificate() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-lg"
      >
        {/* Certificate Card */}
        <div
          className="relative rounded-2xl p-8 sm:p-10 overflow-hidden"
          style={{
            background: 'var(--color-card)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0px 0px 0px 1px rgba(0,0,0,0.06)',
          }}
        >
          {/* Gradient border */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              border: '3px solid transparent',
              backgroundImage:
                'linear-gradient(var(--color-card), var(--color-card)), linear-gradient(135deg, #c96442, #d97757, #c96442)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
            }}
          />

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
            <div className="flex justify-center mb-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(201,100,66,0.12)' }}
              >
                <Award size={32} style={{ color: 'var(--color-brand)' }} />
              </div>
            </div>

            <h1
              className="text-2xl font-bold mb-1"
              style={{ fontFamily: "'Playfair Display', serif", color: 'var(--color-text)' }}
            >
              TalentX 能力认证
            </h1>
            <div className="h-px w-16 mx-auto my-4" style={{ background: 'var(--color-border)' }} />

            <p className="text-sm mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
              兹证明
            </p>
            <p
              className="text-3xl font-bold mb-4"
              style={{ fontFamily: "'Playfair Display', serif", color: 'var(--color-text)' }}
            >
              张三
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              通过 TalentX 六维能力评估体系认证，达到
            </p>

            <div className="mb-6">
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
            </div>

            <div className="flex justify-between items-end text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              <div className="text-left">
                <div>签发日期：{ISSUE_DATE}</div>
                <div className="mt-1 font-mono">编号：{CERT_ID}</div>
              </div>
              <div className="text-right">
                <div className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>TalentX 认证委员会</div>
                <div className="mt-1">数字签名 ✓</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-3 mt-6">
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
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: 'var(--color-brand)',
              color: '#fff',
            }}
          >
            <Share2 size={16} /> 分享
          </button>
        </div>
      </motion.div>
    </div>
  );
}
