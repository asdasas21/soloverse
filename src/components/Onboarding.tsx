import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { X, ArrowRight, Target, Eye, BarChart3, Award, Users, Swords, Code, Layers, Zap, FileCheck, GitBranch, ShieldCheck, Brain, TrendingUp, Search, Briefcase, Building2, CheckCircle2, Database } from 'lucide-react'

const ONBOARDING_KEY = 'talentx_onboarding_completed'
const ENTERPRISE_ONBOARDING_KEY = 'talentx_enterprise_onboarding_completed'

export function shouldShowOnboarding(): boolean {
  return !localStorage.getItem(ONBOARDING_KEY)
}

export function markOnboardingCompleted() {
  localStorage.setItem(ONBOARDING_KEY, '1')
}

export function shouldShowEnterpriseOnboarding(): boolean {
  return !localStorage.getItem(ENTERPRISE_ONBOARDING_KEY)
}

export function markEnterpriseOnboardingCompleted() {
  localStorage.setItem(ENTERPRISE_ONBOARDING_KEY, '1')
}

// ===================== Talent (个人端) Slides =====================

const talentSlides = [
  {
    icon: Swords,
    title: '欢迎来到 TalentX',
    subtitle: '人才试炼场',
    desc: '这里不是考试，是真实工程操作。你将在交互式工作区中做决策、写代码、审查 diff、画架构图——AI 在后台静默采集你的每一个行为。',
    highlight: '简历可以包装，真实行为不会说谎',
  },
  {
    icon: Layers,
    title: '五种工作区',
    subtitle: '真实工程场景',
    desc: '决策模拟、代码审查台、架构设计画板、代码编辑器、路演构建器。每种工作区模拟一种真实的工程操作，AI 从你的操作方式中提取能力信号。',
    tags: ['决策模拟', '代码审查', '架构设计', '编码实战', '路演构建'],
  },
  {
    icon: Brain,
    title: '六维能力 DNA',
    subtitle: '不是单一分数',
    desc: '好奇心、靠谱、事实洁癖、多元化思维、忍受不确定性、低 ego 高自驱。六个维度构成你独一无二的能力指纹，渐进式 EMA 算法动态更新。',
    dimensions: [
      { label: '好奇心', icon: Brain },
      { label: '靠谱', icon: ShieldCheck },
      { label: '事实洁癖', icon: FileCheck },
      { label: '多元化思维', icon: GitBranch },
      { label: '忍受不确定性', icon: Target },
      { label: '低 ego 高自驱', icon: TrendingUp },
    ],
  },
  {
    icon: Award,
    title: 'C1-C3 能力认证',
    subtitle: '简历替代品',
    desc: '综合分达到 60/75/88 分别获得 C1（基础）/C2（专业）/C3（专家）认证。每张证书有唯一验证码，企业可在线验真。认证 + 能力 DNA = 不可伪造的能力证明。',
    levels: [
      { level: 'C1', name: '基础级', score: '60+', color: '#87867f' },
      { level: 'C2', name: '专业级', score: '75+', color: '#c96442' },
      { level: 'C3', name: '专家级', score: '88+', color: '#4a8c6f' },
    ],
  },
  {
    icon: Users,
    title: '从试炼到真实项目',
    subtitle: '任务广场',
    desc: '用你的认证申请真实项目任务，企业发布、真实报酬、交付互评。试炼认证 + 真实交付记录 = 完整的能力证明链。',
    highlight: '先证明能力，再接真实项目',
    cta: '开始第一个试炼',
  },
]

// ===================== Enterprise (企业端) Slides =====================

const enterpriseSlides = [
  {
    icon: Building2,
    title: '欢迎来到企业端',
    subtitle: 'TalentX Enterprise',
    desc: '这里是你的候选人管理中枢。TalentX 用行为数据替代简历筛选——候选人通过真实工程试炼，AI 静默采集六维能力信号，生成不可伪造的能力 DNA 和 C1-C3 认证。',
    highlight: '用真实行为数据做招聘决策',
  },
  {
    icon: Search,
    title: '候选人库',
    subtitle: '精准筛选',
    desc: '所有通过 TalentX 试炼的候选人都会出现在你的候选人库中。按认证等级（C1/C2/C3）、能力维度、最低综合分筛选，找到最匹配岗位需求的人选。',
    tags: ['认证等级筛选', '维度排序', '最低分过滤', '关键词搜索'],
  },
  {
    icon: BarChart3,
    title: '六维能力画像',
    subtitle: '比简历更深',
    desc: '每位候选人都有六维能力雷达图：好奇心、靠谱、事实洁癖、多元化思维、忍受不确定性、低 ego 高自驱。点开候选人详情查看完整画像、试炼历史和认证证书。',
    dimensions: [
      { label: '好奇心', icon: Brain },
      { label: '靠谱', icon: ShieldCheck },
      { label: '事实洁癖', icon: FileCheck },
      { label: '多元化思维', icon: GitBranch },
      { label: '忍受不确定性', icon: Target },
      { label: '低 ego 高自驱', icon: TrendingUp },
    ],
  },
  {
    icon: Award,
    title: '证书在线验真',
    subtitle: '不可伪造',
    desc: '每张 C1/C2/C3 认证证书都有唯一验证码。你可以通过证书编号在线验真，确认候选人的认证等级和评估详情。所有评估数据来自真实工程操作，非自述。',
    highlight: '每张证书都有唯一验证码，可在线验真',
  },
  {
    icon: Briefcase,
    title: '发布任务',
    subtitle: '试炼到交付',
    desc: '在定制试炼中发布真实项目任务，设置报酬和认证门槛。通过认证的候选人可以申请参与，你审批后开始协作。交付后双方互评，形成完整的能力证明链。',
    tags: ['发布任务', '设置报酬', '认证门槛', '交付互评'],
  },
  {
    icon: Database,
    title: 'MCP 协议接入',
    subtitle: 'AI 原生集成',
    desc: 'TalentX 支持标准 MCP（Model Context Protocol）协议。你的 AI 助手（Claude、Cursor 等）可以直接查询候选人画像、搜索人才库、验证证书——无需离开工作流。',
    highlight: '支持 Claude、Cursor 等 AI 工具直接接入',
    cta: '进入仪表盘',
  },
]

// ===================== Shared Component =====================

interface SlideData {
  icon: any
  title: string
  subtitle: string
  desc: string
  highlight?: string
  tags?: string[]
  dimensions?: { label: string; icon: any }[]
  levels?: { level: string; name: string; score: string; color: string }[]
  cta?: string
}

export default function Onboarding({ type = 'talent' }: { type?: 'talent' | 'enterprise' }) {
  const isEnterprise = type === 'enterprise'
  const slides: SlideData[] = isEnterprise ? enterpriseSlides : talentSlides
  const storageKey = isEnterprise ? ENTERPRISE_ONBOARDING_KEY : ONBOARDING_KEY
  const markDone = isEnterprise ? markEnterpriseOnboardingCompleted : markOnboardingCompleted
  const checkShow = isEnterprise ? shouldShowEnterpriseOnboarding : shouldShowOnboarding

  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(checkShow())
  const navigate = useNavigate()

  if (!visible) return null

  const slide = slides[step]
  const isLast = step === slides.length - 1

  const handleNext = () => {
    if (isLast) {
      markDone()
      setVisible(false)
      if (!isEnterprise) navigate('/trials')
    } else {
      setStep(step + 1)
    }
  }

  const handleSkip = () => {
    markDone()
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ background: 'rgba(20,20,19,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={handleSkip}
        >
          <motion.div
            className="relative w-full max-w-lg rounded-3xl overflow-hidden"
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            style={{ background: '#f5f4ed', border: '1px solid #e8e6dc' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button onClick={handleSkip}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ background: 'rgba(0,0,0,0.05)' }}>
              <X size={16} style={{ color: '#5e5d59' }} />
            </button>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5 pt-8 pb-2">
              {slides.map((_, i) => (
                <div key={i} className="h-1 rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? '24px' : '6px',
                    background: i === step ? '#c96442' : '#d8d6ce',
                  }} />
              ))}
            </div>

            {/* Content */}
            <div className="px-8 py-6">
              <motion.div key={step}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}>
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(201,100,66,0.08)' }}>
                    <slide.icon size={28} style={{ color: '#c96442' }} />
                  </div>
                </div>

                {/* Subtitle */}
                <p className="text-center text-xs font-medium mb-2" style={{ color: '#c96442', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {slide.subtitle}
                </p>

                {/* Title */}
                <h2 className="text-center text-2xl font-bold mb-4" style={{ color: '#141413', fontFamily: "'Playfair Display', serif" }}>
                  {slide.title}
                </h2>

                {/* Description */}
                <p className="text-center text-sm leading-relaxed mb-6 max-w-sm mx-auto" style={{ color: '#5e5d59' }}>
                  {slide.desc}
                </p>

                {/* Tags */}
                {slide.tags && (
                  <div className="flex flex-wrap justify-center gap-2 mb-2">
                    {slide.tags.map(t => (
                      <span key={t} className="text-[11px] px-3 py-1 rounded-full"
                        style={{ background: 'rgba(201,100,66,0.06)', color: '#c96442' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Dimensions */}
                {slide.dimensions && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {slide.dimensions.map(d => (
                      <div key={d.label} className="flex flex-col items-center gap-1 p-2 rounded-lg" style={{ background: 'rgba(201,100,66,0.04)' }}>
                        <d.icon size={16} style={{ color: '#c96442' }} />
                        <span className="text-[10px] font-medium" style={{ color: '#5e5d59' }}>{d.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Levels */}
                {slide.levels && (
                  <div className="flex justify-center gap-3 mb-2">
                    {slide.levels.map(l => (
                      <div key={l.level} className="flex flex-col items-center px-4 py-3 rounded-xl" style={{ background: 'rgba(201,100,66,0.04)', border: '1px solid #e8e6dc' }}>
                        <span className="text-lg font-bold" style={{ color: l.color, fontFamily: "'Playfair Display', serif" }}>{l.level}</span>
                        <span className="text-xs font-medium" style={{ color: '#141413' }}>{l.name}</span>
                        <span className="text-[10px]" style={{ color: '#87867f' }}>{l.score}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Highlight */}
                {slide.highlight && (
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CheckCircle2 size={14} style={{ color: '#4a8c6f' }} />
                    <span className="text-xs font-medium" style={{ color: '#4a8c6f' }}>{slide.highlight}</span>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between px-8 pb-8">
              <button onClick={handleSkip} className="text-xs hover:opacity-70 transition-opacity" style={{ color: '#87867f' }}>
                跳过引导
              </button>
              <button onClick={handleNext}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-transform hover:scale-105"
                style={{ background: '#c96442', color: '#fff', boxShadow: '0 2px 12px rgba(201,100,66,0.25)' }}>
                {isLast ? (slide.cta || '完成') : '下一步'}
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
