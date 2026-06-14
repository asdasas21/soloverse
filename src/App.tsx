import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastProvider } from '@/components/Toast'
import Landing from '@/pages/Landing'
import Auth from '@/pages/Auth'

// Lazy-load non-critical routes for smaller initial bundle
const Trials = lazy(() => import('@/pages/Trials'))
const TrialSession = lazy(() => import('@/pages/TrialSession'))
const Profile = lazy(() => import('@/pages/Profile'))
const Certificate = lazy(() => import('@/pages/Certificate'))
const Leaderboard = lazy(() => import('@/pages/Leaderboard'))
const EnterpriseDashboard = lazy(() => import('@/pages/EnterpriseDashboard'))
const SkillStudio = lazy(() => import('@/pages/SkillStudio'))
const Pricing = lazy(() => import('@/pages/Pricing'))
import { useAuthStore } from '@/store/authStore'

/** 路由守卫：未登录用户重定向到 /auth */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const location = useLocation()
  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}

/** 路由守卫：仅企业端角色可访问 */
function EnterpriseRoute({ children }: { children: React.ReactNode }) {
  const { user, isEnterprise } = useAuthStore()
  const location = useLocation()
  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />
  }
  if (!isEnterprise) {
    return <Navigate to="/trials" replace />
  }
  return <>{children}</>
}

/** 路由守卫：企业端用户不能进入试炼流程 */
function TalentRoute({ children }: { children: React.ReactNode }) {
  const { user, isEnterprise } = useAuthStore()
  const location = useLocation()
  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />
  }
  if (isEnterprise) {
    return <Navigate to="/enterprise" replace />
  }
  return <>{children}</>
}

function AppInner() {
  const { initialize, initialized } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5f4ed' }}>
        <div className="animate-pulse text-[#87867f]">加载中...</div>
      </div>
    )
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5f4ed' }}>
        <div className="animate-pulse text-[#87867f]">加载中...</div>
      </div>
    }>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/trials" element={<TalentRoute><Trials /></TalentRoute>} />
      <Route path="/trials/:id" element={<TalentRoute><TrialSession /></TalentRoute>} />
      <Route path="/profile/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/cert/:id" element={<Certificate />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/enterprise" element={<EnterpriseRoute><EnterpriseDashboard /></EnterpriseRoute>} />
      <Route path="/skills" element={<ProtectedRoute><SkillStudio /></ProtectedRoute>} />
      <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
      <Route path="*" element={<div className="min-h-screen flex items-center justify-center bg-[#f5f4ed] text-[#5e5d59]">404 - 页面不存在</div>} />
    </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router>
          <AppInner />
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  )
}
