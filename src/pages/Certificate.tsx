import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Award, Printer, Share2, ShieldCheck, AlertCircle, ArrowLeft, Loader2, Image } from 'lucide-react';
import { getCertificate } from '@/api/client';
import ShareCard from '@/components/ShareCard';

interface CertData {
  id: string;
  userId?: string;
  userName: string;
  level: string;
  levelName: string;
  certScore: number;
  dimensions: Record<string, number>;
  issuedAt: string;
  validUntil: string;
}

const LEVEL_NAMES: Record<string, string> = {
  C1: '基础级',
  C2: '专业级',
  C3: '专家级',
};

const DIM_LABELS: Record<string, string> = {
  curiosity: '好奇心',
  reliability: '靠谱',
  factChecking: '事实洁癖',
  diverseThinking: '多元化思维',
  uncertaintyTolerance: '忍受不确定性',
  lowEgoHighDrive: '低ego高自驱',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

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
        <div key={p.i} className="confetti-particle" style={{
          left: `${p.left}%`, bottom: '30%', width: p.size, height: p.size,
          background: `hsl(${p.hue})`, animationDelay: `${p.delay}s`,
        }} />
      ))}
    </div>
  );
}

export default function Certificate() {
  const { id } = useParams<{ id: string }>();
  const [cert, setCert] = useState<CertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getCertificate(id)
      .then((res: any) => {
        const data = res.data || res;
        if (data) {
          setCert({
            id: data.id,
            userId: data.userId,
            userName: data.userName,
            level: data.level,
            levelName: data.levelName || LEVEL_NAMES[data.level] || data.level,
            certScore: data.certScore,
            dimensions: data.dimensions || data.portrait || {},
            issuedAt: data.issuedAt,
            validUntil: data.validUntil,
          });
        }
      })
      .catch((err: Error) => setError(err.message || '证书加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToast(true);
      setTimeout(() => setToast(false), 2000);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5f4ed' }}>
        <Loader2 size={24} className="animate-spin" style={{ color: '#c96442' }} />
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f5f4ed' }}>
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-lg font-medium text-[#5e5d59] mb-2">证书未找到</h2>
          <p className="text-sm text-[#87867f] mb-4">{error || '请检查证书编号是否正确'}</p>
          <Link to="/" className="text-sm" style={{ color: '#c96442' }}>返回首页</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f5f4ed', fontFamily: "'DM Sans', sans-serif" }}>
      <Confetti />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }} className="w-full max-w-lg">
        {/* Certificate Card */}
        <div className="relative rounded-2xl p-8 sm:p-10 overflow-hidden bg-white" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0px 0px 0px 1px rgba(0,0,0,0.06)' }}>
          <div className="absolute inset-0 rounded-2xl pointer-events-none cert-border" />
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '128px 128px' }} />

          <div className="relative text-center">
            <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.4 }} className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(201,100,66,0.12)' }}>
                <Award size={32} style={{ color: '#c96442' }} />
              </div>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="text-2xl font-bold mb-1 text-[#141413]" style={{ fontFamily: "'Playfair Display', serif" }}>
              TalentX 能力认证
            </motion.h1>
            <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.7, duration: 0.4 }} className="h-px w-16 mx-auto my-4 bg-[#e8e6dc]" />

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }} className="text-sm text-[#87867f] mb-1">兹证明</motion.p>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="text-3xl font-bold mb-4 text-[#141413]" style={{ fontFamily: "'Playfair Display', serif" }}>
              {cert.userName}
            </motion.p>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }} className="text-sm mb-6 text-[#5e5d59]">
              通过 TalentX 六维能力评估体系认证，综合得分 {cert.certScore}，达到
            </motion.p>

            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9, type: 'spring', stiffness: 200, damping: 15 }} className="mb-6">
              <span className="inline-block text-4xl font-bold px-6 py-2 rounded-lg text-[#c96442]" style={{ fontFamily: "'Playfair Display', serif", background: 'rgba(201,100,66,0.08)' }}>
                {cert.level} {cert.levelName}
              </span>
            </motion.div>

            {/* Dimension scores */}
            {cert.dimensions && Object.keys(cert.dimensions).length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.95 }} className="grid grid-cols-3 gap-2 mb-6">
                {Object.entries(cert.dimensions).map(([key, val]) => (
                  <div key={key} className="rounded-lg px-2 py-1.5" style={{ background: 'rgba(201,100,66,0.04)' }}>
                    <div className="text-[10px] text-[#87867f]">{DIM_LABELS[key] || key}</div>
                    <div className="text-sm font-bold" style={{ color: '#c96442' }}>{val}</div>
                  </div>
                ))}
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }} className="flex justify-between items-end text-xs text-[#87867f]">
              <div className="text-left">
                <div>签发日期：{formatDate(cert.issuedAt)}</div>
                <div className="mt-1 font-mono">编号：{cert.id}</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-[#5e5d59]">TalentX 认证委员会</div>
                <div className="mt-1 flex items-center gap-1 justify-end">
                  <ShieldCheck size={12} style={{ color: '#4a8c6f' }} />
                  <span style={{ color: '#4a8c6f' }}>数字签名验证通过</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Validity notice */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.05 }} className="flex items-center justify-center gap-2 mt-4 text-xs text-[#87867f]">
          <ShieldCheck size={14} style={{ color: '#4a8c6f' }} />
          <span>有效期至 {formatDate(cert.validUntil)} · 任何人可通过此链接验证证书真伪</span>
        </motion.div>

        {/* Actions */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} className="flex justify-center gap-3 mt-4">
          <Link to={cert.userId ? `/profile/${cert.userId}` : '/'} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-white text-[#141413] border border-[#e8e6dc]">
            <ArrowLeft size={16} /> 返回
          </Link>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-white text-[#141413] border border-[#e8e6dc]">
            <Printer size={16} /> 打印
          </button>
          <button onClick={handleShare} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: '#c96442' }} title="复制验证链接到剪贴板">
            <Share2 size={16} /> 复制验证链接
          </button>
          <button onClick={() => setShowShareCard(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg, #c96442, #d97757)' }} title="生成可保存的图片卡片">
            <Image size={16} /> 生成分享图
          </button>
        </motion.div>

        {toast && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center mt-4 text-sm font-medium" style={{ color: '#c96442' }}>
            已复制验证链接
          </motion.div>
        )}
      </motion.div>

      {/* 能力分享卡片 */}
      {showShareCard && cert && (
        <ShareCard
          userName={cert.userName}
          certLevel={cert.level}
          certScore={cert.certScore}
          portrait={cert.dimensions as any}
          onClose={() => setShowShareCard(false)}
        />
      )}

      <style>{`
        @property --angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
        @keyframes rotate-border { to { --angle: 360deg; } }
        .cert-border {
          border: 2.5px solid transparent;
          background: linear-gradient(white, white) padding-box, conic-gradient(from var(--angle), #c96442, #d97757, #f5e6d0, #d97757, #c96442) border-box;
          animation: rotate-border 4s linear infinite;
          border-radius: 1rem;
        }
        @keyframes confetti-rise {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-120px) rotate(360deg); opacity: 0; }
        }
        .confetti-particle { position: absolute; border-radius: 50%; animation: confetti-rise 1.2s ease-out forwards; }
      `}</style>
    </div>
  );
}
