import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Swords, Code, Award } from 'lucide-react';
import CountUp from '@/components/CountUp';

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

export default function Landing() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-[90vh] px-6 text-center overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'linear-gradient(135deg, #f5f4ed 0%, #ede8dc 25%, #f0e6d8 50%, #e8ddd0 75%, #f5f4ed 100%)',
            backgroundSize: '300% 300%',
            animation: 'gradient-shift 12s ease infinite',
          }}
        />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(201,100,66,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(217,119,87,0.05) 0%, transparent 50%)',
        }} />

        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            TalentX
            <span className="block text-3xl md:text-5xl mt-2 font-normal" style={{ color: 'var(--color-text-secondary)' }}>
              人才试炼场
            </span>
          </h1>
          <p className="text-lg md:text-xl max-w-lg mx-auto mb-10" style={{ color: 'var(--color-text-muted)' }}>
            让你被看见的方式，不再是简历
          </p>
          <Link
            to="/trials"
            className="inline-block px-8 py-3.5 rounded-full text-base font-medium transition-all duration-200 hover:scale-105"
            style={{
              background: 'var(--color-brand)',
              color: '#fff',
              boxShadow: '0 2px 12px rgba(201,100,66,0.25)',
            }}
          >
            开始试炼
          </Link>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            className="text-3xl md:text-4xl font-bold text-center mb-16"
            style={{ color: 'var(--color-text-primary)' }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            如何运作
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                className="flex flex-col items-center text-center p-8 rounded-2xl"
                style={{
                  background: 'var(--color-surface)',
                  boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.06)',
                }}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: 'var(--color-btn-bg)' }}
                >
                  <step.icon size={26} style={{ color: 'var(--color-brand)' }} />
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-24 px-6" style={{ background: 'var(--color-surface)' }}>
        <div className="max-w-4xl mx-auto">
          <motion.h2
            className="text-3xl md:text-4xl font-bold text-center mb-16"
            style={{ color: 'var(--color-text-primary)' }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            市场趋势
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="flex flex-col items-center text-center p-8"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <CountUp target={stat.target} suffix={stat.suffix} />
                <p className="mt-3 text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            准备好被看见了吗？
          </h2>
          <p className="mb-10 text-lg" style={{ color: 'var(--color-text-muted)' }}>
            用真实能力，取代纸面简历
          </p>
          <Link
            to="/trials"
            className="inline-block px-8 py-3.5 rounded-full text-base font-medium transition-all duration-200 hover:scale-105"
            style={{
              background: 'var(--color-brand)',
              color: '#fff',
              boxShadow: '0 2px 12px rgba(201,100,66,0.25)',
            }}
          >
            开始试炼
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
