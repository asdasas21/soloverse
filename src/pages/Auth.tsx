import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Mail, Lock, User, ArrowRight, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export default function Auth() {
  const navigate = useNavigate()
  const { signIn, signUp, loading, user, initialized } = useAuthStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialized && user) navigate('/trials')
  }, [user, initialized, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (mode === 'register' && !username.trim()) {
      setError('请输入用户名')
      return
    }
    const result = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password, username)
    if (result.error) {
      const msg = result.error
      let cnMsg = msg
      if (msg.includes('Invalid login credentials')) cnMsg = '邮箱或密码错误'
      else if (msg.includes('Email not confirmed')) cnMsg = '邮箱未验证，请检查邮箱'
      else if (msg.includes('User already registered')) cnMsg = '该邮箱已注册'
      else if (msg.includes('Password should be at least')) cnMsg = '密码至少需要 6 位'
      setError(cnMsg)
    }
  }

  const handleDemo = async (email: string, password: string) => {
    setError('')
    const result = await signIn(email, password)
    if (result.error) setError(result.error)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #f5f4ed 0%, #ede9e0 100%)', fontFamily: "'DM Sans', sans-serif" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.img
            src="/logo.svg"
            alt="TalentX"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="w-16 h-16 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-[#141413]" style={{ fontFamily: "'Playfair Display', serif" }}>
            TalentX
          </h1>
          <p className="text-sm text-[#5e5d59] mt-1">人才试炼场</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e6dc] p-8">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-lg mb-6" style={{ background: '#f5f4ed' }}>
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${
                  mode === m ? 'bg-white text-[#141413] shadow-sm' : 'text-[#87867f]'
                }`}
              >
                {m === 'login' ? '登录' : '注册'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="relative">
                    <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#87867f]" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="用户名"
                      className="w-full pl-11 pr-4 py-3 rounded-lg border border-[#e8e6dc] bg-[#faf9f5] text-sm text-[#141413] placeholder:text-[#87867f] outline-none focus:border-[#c96442] focus:ring-2 focus:ring-[#c96442]/15 transition-all"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#87867f]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="邮箱"
                required
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-[#e8e6dc] bg-[#faf9f5] text-sm text-[#141413] placeholder:text-[#87867f] outline-none focus:border-[#c96442] focus:ring-2 focus:ring-[#c96442]/15 transition-all"
              />
            </div>

            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#87867f]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码"
                required
                minLength={6}
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-[#e8e6dc] bg-[#faf9f5] text-sm text-[#141413] placeholder:text-[#87867f] outline-none focus:border-[#c96442] focus:ring-2 focus:ring-[#c96442]/15 transition-all"
              />
            </div>

            {mode === 'login' && (
              <div className="flex justify-end -mt-2">
                <button
                  type="button"
                  onClick={() => {
                    const email = prompt('请输入注册邮箱，我们将发送重置链接：');
                    if (email) {
                      import('@supabase/supabase-js').then(({ createClient }) => {
                        const supabase = createClient(
                          import.meta.env.VITE_SUPABASE_URL,
                          import.meta.env.VITE_SUPABASE_ANON_KEY
                        );
                        supabase.auth.resetPasswordForEmail(email).then(({ error }) => {
                          if (error) alert('发送失败：' + error.message);
                          else alert('重置链接已发送到你的邮箱，请查收');
                        });
                      });
                    }
                  }}
                  className="text-xs hover:underline"
                  style={{ color: '#87867f' }}
                >
                  忘记密码？
                </button>
              </div>
            )}

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-red-500 px-1"
              >
                {error}
              </motion.p>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-lg text-white font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: '#c96442' }}
            >
              {loading ? '处理中...' : (
                <>
                  {mode === 'login' ? '登录' : '创建账号'}
                  <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </form>

          {/* Demo accounts */}
          <div className="mt-4 pt-4 border-t border-[#e8e6dc]">
            <p className="text-xs text-center mb-3" style={{ color: '#87867f' }}>演示账号（点击直接登录）</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleDemo('demo@talentx.dev', 'demo123456')}
                className="py-2 px-3 rounded-lg text-xs font-medium flex flex-col items-center gap-0.5 transition-colors"
                style={{ background: 'rgba(201,100,66,0.08)', color: '#c96442' }}
              >
                <span className="flex items-center gap-1"><Sparkles size={12} /> 高分演示</span>
                <span className="text-[10px] opacity-70">C3 专家级</span>
              </button>
              <button
                onClick={() => handleDemo('mid@talentx.dev', 'mid123456')}
                className="py-2 px-3 rounded-lg text-xs font-medium flex flex-col items-center gap-0.5 transition-colors"
                style={{ background: 'rgba(217,119,87,0.08)', color: '#d97757' }}
              >
                <span>中分演示</span>
                <span className="text-[10px] opacity-70">C2 专业级</span>
              </button>
              <button
                onClick={() => handleDemo('low@talentx.dev', 'low123456')}
                className="py-2 px-3 rounded-lg text-xs font-medium flex flex-col items-center gap-0.5 transition-colors"
                style={{ background: 'rgba(123,155,110,0.08)', color: '#7b9b6e' }}
              >
                <span>低分演示</span>
                <span className="text-[10px] opacity-70">C1 基础级</span>
              </button>
              <button
                onClick={() => handleDemo('enterprise@talentx.dev', 'ent123456')}
                className="py-2 px-3 rounded-lg text-xs font-medium flex flex-col items-center gap-0.5 transition-colors"
                style={{ background: 'rgba(91,107,140,0.08)', color: '#5b6b8c' }}
              >
                <span>企业端演示</span>
                <span className="text-[10px] opacity-70">HR 视角</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-[#87867f] mt-6">
          登录即表示同意 TalentX 服务条款和隐私政策
        </p>
      </motion.div>
    </div>
  )
}
