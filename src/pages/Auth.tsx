import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Trophy, Mail, Lock, User, ArrowRight, Sparkles } from 'lucide-react'
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
      setError(result.error)
    }
  }

  const handleDemo = async () => {
    setError('')
    const result = await signIn('demo@talentx.dev', 'demo123456')
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
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: '#c96442' }}
          >
            <Trophy size={28} className="text-white" />
          </motion.div>
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

          {/* Demo login */}
          <div className="mt-4 pt-4 border-t border-[#e8e6dc]">
            <button
              onClick={handleDemo}
              className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              style={{ background: 'rgba(201,100,66,0.08)', color: '#c96442' }}
            >
              <Sparkles size={14} />
              体验演示账号
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-[#87867f] mt-6">
          登录即表示同意 TalentX 服务条款和隐私政策
        </p>
      </motion.div>
    </div>
  )
}
