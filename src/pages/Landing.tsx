import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Swords, Code, Award, LogOut, TrendingUp, ShieldCheck, Brain } from 'lucide-react';
import CountUp from '@/components/CountUp';
import { useAuthStore } from '@/store/authStore';

// Nav auth button
function NavAuth() {
  const { user, profile, isEnterprise, signOut } = useAuthStore();
  const navigate = useNavigate();
  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span
          className="cursor-pointer hover:opacity-70 transition-opacity"
          style={{ color: '#c96442' }}
          onClick={() => navigate(isEnterprise ? '/enterprise' : `/profile/${user.id}`)}
        >
          {profile?.display_name || profile?.username || '我的'}
        </span>
        <button onClick={() => signOut()} className="hover:opacity-70 transition-opacity">
          <LogOut size={14} />
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={() => navigate('/auth')}
      className="px-4 py-1.5 rounded-lg text-white text-xs font-medium"
      style={{ background: '#c96442' }}
    >
      登录 / 注册
    </button>
  );
}

// Nav links based on role
function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const { isEnterprise } = useAuthStore();
  if (isEnterprise) {
    return (
      <>
        <Link to="/enterprise" className="hover:opacity-70 transition-opacity">人才库</Link>
        <Link to="/leaderboard" className="hover:opacity-70 transition-opacity">排行榜</Link>
        {!mobile && <NavAuth />}
      </>
    );
  }
  return (
    <>
      <Link to="/trials" className="hover:opacity-70 transition-opacity">{mobile ? '试炼' : '试炼大厅'}</Link>
      <Link to="/leaderboard" className="hover:opacity-70 transition-opacity">{mobile ? '排行' : '排行榜'}</Link>
      {!mobile && <Link to="/skills" className="hover:opacity-70 transition-opacity" title="创建和分享 AI 技能">Skill Studio</Link>}
      {!mobile && <NavAuth />}
      {mobile && <NavAuth />}
    </>
  );
}

const steps = [
  {
    icon: Swords,
    title: '进入工作区',
    subtitle: 'Enter the Arena',
    desc: '选择黑客松、代码审查、系统设计等真实工程场景。你将在交互式工作区中操作——做决策、写代码、画架构、审 diff',
    highlight: '7 大场景 · 真实工程',
  },
  {
    icon: Code,
    title: 'AI 静默观察',
    subtitle: 'Silent Assessment',
    desc: '没有聊天，没有口试。你在工作区中真实操作，AI Agent 在后台静默采集行为数据——决策质量、代码习惯、架构思路、应对危机的反应',
    highlight: '行为驱动 · 零对话',
  },
  {
    icon: Award,
    title: '获得能力认证',
    subtitle: 'Get Certified',
    desc: '基于 EMA 算法综合各场景行为数据，生成六维能力 DNA。C1-C3 级认证可作为简历替代品直接展示给雇主',
    highlight: '在线可验证',
  },
];

const stats = [
  { target: 12, suffix: 'x', label: 'AI 岗位增速（vs 传统岗位）', source: 'LinkedIn 2025' },
  { target: 500, suffix: '万+', label: '全球 AI 人才缺口', source: 'McKinsey' },
  { target: 63, suffix: '%', label: '头部企业已用 AI 辅助筛选', source: 'Gartner' },
];

const SplitText = ({ text, className }: { text: string; className?: string }) => (
  <span>
    {text.split('').map((char, i) => (
      <motion.span key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: i * 0.05 }} style={{ display: 'inline-block' }} className={className}>
        {char}
      </motion.span>
    ))}
  </span>
);

const MagnetButton = ({ children, to, className, style }: { children: React.ReactNode; to: string; className?: string; style?: React.CSSProperties }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const target = user ? to : '/auth';
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const handleMouse = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({ x: (e.clientX - rect.left - rect.width / 2) * 0.15, y: (e.clientY - rect.top - rect.height / 2) * 0.15 });
  };
  return (
    <motion.div ref={ref} animate={{ x: pos.x, y: pos.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15 }}
      onMouseMove={handleMouse} onMouseLeave={() => setPos({ x: 0, y: 0 })}
      className={className} style={style}
      onClick={() => navigate(target)}>
      {children}
    </motion.div>
  );
};

const css = `
@keyframes aurora {
  0%, 100% { transform: translate(0%, 0%) scale(1); opacity: 0.4; }
  25% { transform: translate(10%, -15%) scale(1.1); opacity: 0.5; }
  50% { transform: translate(-5%, 10%) scale(0.95); opacity: 0.35; }
  75% { transform: translate(-10%, -5%) scale(1.05); opacity: 0.45; }
}`;

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className="min-h-screen relative" style={{ background: '#f5f4ed' }}>
      <style>{css}</style>
      {/* Noise overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }} />

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-40 transition-all duration-300" style={{
        background: scrolled ? 'rgba(245,244,237,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        boxShadow: scrolled ? '0 1px 0 rgba(0,0,0,0.05)' : 'none',
      }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
          <span className="text-xl font-bold cursor-pointer" onClick={() => navigate('/')} style={{ fontFamily: "'Playfair Display', serif", color: '#141413' }}>TalentX</span>
          <div className="hidden md:flex items-center gap-4 text-sm" style={{ color: '#5e5d59' }}>
            <NavLinks />
          </div>
          <div className="flex md:hidden items-center gap-3 text-sm" style={{ color: '#5e5d59' }}>
            <NavLinks mobile />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-[90vh] px-6 text-center overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          {[
            { color: 'rgba(201,100,66,0.12)', x: '20%', y: '25%', size: '60%', d: '0s' },
            { color: 'rgba(217,119,87,0.10)', x: '65%', y: '55%', size: '50%', d: '-4s' },
            { color: 'rgba(232,200,160,0.10)', x: '45%', y: '15%', size: '55%', d: '-8s' },
          ].map((b, i) => (
            <div key={i} className="absolute" style={{
              top: b.y, left: b.x, width: b.size, height: b.size,
              borderRadius: '40% 60% 60% 40% / 60% 40% 60% 40%',
              background: `radial-gradient(circle, ${b.color}, transparent 70%)`,
              animation: `aurora 16s ease-in-out infinite ${b.d}`, filter: 'blur(40px)',
            }} />
          ))}
        </div>
        <motion.div className="relative z-10" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
            style={{ background: 'rgba(201,100,66,0.08)', border: '1px solid rgba(201,100,66,0.15)' }}
          >
            <Brain size={14} style={{ color: '#c96442' }} />
            <span className="text-xs font-medium" style={{ color: '#c96442' }}>AI 驱动的能力认证平台</span>
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight" style={{ color: '#141413' }}>
            <SplitText text="TalentX" />
            <span className="block text-3xl md:text-5xl mt-2 font-normal" style={{ color: '#5e5d59' }}>人才试炼场</span>
          </h1>
          <p className="text-lg md:text-xl max-w-lg mx-auto mb-10" style={{ color: '#5e5d59' }}>
            简历可以包装，真实行为不会说谎
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            <span className="text-[11px] px-3 py-1 rounded-full" style={{ background: 'rgba(201,100,66,0.08)', color: '#c96442' }}>决策模拟</span>
            <span className="text-[11px] px-3 py-1 rounded-full" style={{ background: 'rgba(74,140,111,0.08)', color: '#4a8c6f' }}>代码审查</span>
            <span className="text-[11px] px-3 py-1 rounded-full" style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>架构设计</span>
            <span className="text-[11px] px-3 py-1 rounded-full" style={{ background: 'rgba(217,119,6,0.08)', color: '#d97706' }}>编码实战</span>
            <span className="text-[11px] px-3 py-1 rounded-full" style={{ background: 'rgba(139,111,192,0.08)', color: '#8b6fc0' }}>路演构建</span>
          </div>
          <div className="flex items-center justify-center gap-4">
            <MagnetButton to="/trials" className="inline-block px-8 py-3.5 rounded-full text-base font-medium cursor-pointer"
              style={{ background: '#c96442', color: '#fff', boxShadow: '0 2px 12px rgba(201,100,66,0.25)' }}>
              开始试炼
            </MagnetButton>
            <MagnetButton to="/leaderboard" className="inline-block px-6 py-3.5 rounded-full text-base font-medium cursor-pointer"
              style={{ background: 'transparent', color: '#5e5d59', border: '1px solid #e8e6dc' }}>
              查看排行榜
            </MagnetButton>
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: '#141413', fontFamily: "'Playfair Display', serif" }}>
              三步获得能力认证
            </h2>
            <p className="text-base" style={{ color: '#87867f' }}>
              从对话到认证，全程 AI 驱动，无需投递简历
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <motion.div key={step.title}
                className="group relative rounded-2xl p-6 transition-all hover:-translate-y-1"
                style={{ background: '#faf9f5', border: '1px solid #e8e6dc' }}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.15 }}>
                {/* Step number */}
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: 'rgba(201,100,66,0.08)' }}>
                    <step.icon size={22} style={{ color: '#c96442' }} />
                  </div>
                  <span className="text-4xl font-bold opacity-10" style={{ color: '#c96442', fontFamily: "'Playfair Display', serif" }}>
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-1" style={{ color: '#141413' }}>{step.title}</h3>
                <p className="text-xs mb-3" style={{ color: '#c96442', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.05em' }}>{step.subtitle}</p>
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#5e5d59' }}>{step.desc}</p>
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(201,100,66,0.06)', color: '#c96442' }}>
                  <ShieldCheck size={12} /> {step.highlight}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats / Market */}
      <section id="stats" className="py-24 px-6" style={{ background: '#faf9f5' }}>
        <div className="max-w-4xl mx-auto">
          <motion.div className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 mb-3">
              <TrendingUp size={20} style={{ color: '#c96442' }} />
              <span className="text-sm font-medium" style={{ color: '#c96442' }}>为什么是现在</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold" style={{ color: '#141413', fontFamily: "'Playfair Display', serif" }}>
              AI 时代，能力需要新的度量衡
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {stats.map((stat, i) => (
              <motion.div key={stat.label} className="flex flex-col items-center text-center"
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}>
                <CountUp target={stat.target} suffix={stat.suffix} />
                <p className="mt-3 text-sm font-medium" style={{ color: '#5e5d59' }}>{stat.label}</p>
                <p className="mt-1 text-xs" style={{ color: '#b0afa7' }}>{stat.source}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <h2 className="text-3xl md:text-5xl font-bold mb-4" style={{ color: '#141413', fontFamily: "'Playfair Display', serif" }}>
            你的能力，经得起多维度检验
          </h2>
          <p className="mb-10 text-lg max-w-xl mx-auto" style={{ color: '#5e5d59' }}>
            不需要投递，不需要内推。用一场工作区评估，让真实行为数据替你说话。
          </p>
          <MagnetButton to="/trials" className="inline-block px-8 py-3.5 rounded-full text-base font-medium cursor-pointer"
            style={{ background: '#c96442', color: '#fff', boxShadow: '0 2px 12px rgba(201,100,66,0.25)' }}>
            开始试炼
          </MagnetButton>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t" style={{ borderColor: '#e8e6dc', background: '#f5f4ed' }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm" style={{ color: '#87867f' }}>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg" style={{ fontFamily: "'Playfair Display', serif", color: '#141413' }}>TalentX</span>
            <span className="text-xs">AI 驱动的能力认证平台</span>
          </div>
          <div className="flex items-center gap-5 text-xs">
            <Link to="/trials" className="hover:opacity-70 transition-opacity">试炼大厅</Link>
            <Link to="/leaderboard" className="hover:opacity-70 transition-opacity">排行榜</Link>
            <Link to="/skills" className="hover:opacity-70 transition-opacity">Skill Studio</Link>
            <Link to="/enterprise" className="hover:opacity-70 transition-opacity">企业端</Link>
          </div>
          <div className="text-xs">© 2026 TalentX · Soloverse</div>
        </div>
      </footer>
    </div>
  );
}
