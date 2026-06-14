import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Swords, Code, Award, LogOut } from 'lucide-react';
import CountUp from '@/components/CountUp';
import { DemoChat } from '@/components/DemoChat';
import { useAuthStore } from '@/store/authStore';

// Nav auth button
function NavAuth() {
  const { user, profile, signOut } = useAuthStore();
  const navigate = useNavigate();
  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span
          className="cursor-pointer hover:opacity-70 transition-opacity"
          style={{ color: '#c96442' }}
          onClick={() => navigate(`/profile/${user.id}`)}
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

const steps = [
  { icon: Swords, title: '选择试炼', desc: '从多个真实场景中选择属于你的挑战' },
  { icon: Code, title: '完成挑战', desc: '用代码和思维证明你的能力' },
  { icon: Award, title: '获取画像', desc: 'AI 生成你独一无二的能力图谱' },
];

const stats = [
  { target: 12, suffix: 'x', label: 'AI岗位增长' },
  { target: 500, suffix: '万+', label: '人才缺口' },
  { target: 63, suffix: '%', label: '企业使用AI招聘' },
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
}
@keyframes border-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
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
          <div className="flex items-center gap-4 text-sm" style={{ color: '#5e5d59' }}>
            <Link to="/trials" className="hover:opacity-70 transition-opacity">试炼大厅</Link>
            <Link to="/leaderboard" className="hover:opacity-70 transition-opacity">排行榜</Link>
            <Link to="/skills" className="hover:opacity-70 transition-opacity">Skill Studio</Link>
            <Link to="/enterprise" className="hover:opacity-70 transition-opacity">企业端</Link>
            <a href="#about" className="hover:opacity-70 transition-opacity">关于我们</a>
            <NavAuth />
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
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight" style={{ color: '#141413' }}>
            <SplitText text="TalentX" />
            <span className="block text-3xl md:text-5xl mt-2 font-normal" style={{ color: '#5e5d59' }}>人才试炼场</span>
          </h1>
          <p className="text-lg md:text-xl max-w-lg mx-auto mb-10" style={{ color: '#5e5d59' }}>让你被看见的方式，不再是简历</p>
          <MagnetButton to="/trials" className="inline-block px-8 py-3.5 rounded-full text-base font-medium cursor-pointer"
            style={{ background: '#c96442', color: '#fff', boxShadow: '0 2px 12px rgba(201,100,66,0.25)' }}>
            开始试炼
          </MagnetButton>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.h2 className="text-3xl md:text-4xl font-bold text-center mb-16" style={{ color: '#141413' }}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            如何运作
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div key={step.title} className="relative p-[1px] rounded-2xl"
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.15 }}>
                <div className="absolute inset-0 rounded-2xl" style={{
                  background: 'linear-gradient(90deg, #e8e6dc, #c96442, #d97757, #e8e6dc)',
                  backgroundSize: '300% 100%', animation: 'border-shift 6s ease infinite', opacity: 0.5,
                }} />
                <div className="relative flex flex-col items-center text-center p-8 rounded-2xl" style={{ background: '#faf9f5' }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(201,100,66,0.08)' }}>
                    <step.icon size={26} style={{ color: '#c96442' }} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: '#141413' }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#5e5d59' }}>{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Chat */}
      <section className="py-24 px-6">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <DemoChat />
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-24 px-6" style={{ background: '#faf9f5' }}>
        <div className="max-w-4xl mx-auto">
          <motion.h2 className="text-3xl md:text-4xl font-bold text-center mb-16" style={{ color: '#141413' }}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            市场趋势
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {stats.map((stat, i) => (
              <motion.div key={stat.label} className="flex flex-col items-center text-center p-8"
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}>
                <CountUp target={stat.target} suffix={stat.suffix} />
                <p className="mt-3 text-sm font-medium" style={{ color: '#5e5d59' }}>{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <h2 className="text-3xl md:text-5xl font-bold mb-4" style={{ color: '#141413' }}>准备好被看见了吗？</h2>
          <p className="mb-10 text-lg" style={{ color: '#5e5d59' }}>用真实能力，取代纸面简历</p>
          <MagnetButton to="/trials" className="inline-block px-8 py-3.5 rounded-full text-base font-medium cursor-pointer"
            style={{ background: '#c96442', color: '#fff', boxShadow: '0 2px 12px rgba(201,100,66,0.25)' }}>
            开始试炼
          </MagnetButton>
        </motion.div>
      </section>
    </div>
  );
}
