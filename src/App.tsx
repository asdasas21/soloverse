import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import Landing from '@/pages/Landing'
import Trials from '@/pages/Trials'
import TrialSession from '@/pages/TrialSession'
import Profile from '@/pages/Profile'
import Certificate from '@/pages/Certificate'
import Auth from '@/pages/Auth'
import Leaderboard from '@/pages/Leaderboard'
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
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/trials" element={<ProtectedRoute><Trials /></ProtectedRoute>} />
      <Route path="/trials/:id" element={<ProtectedRoute><TrialSession /></ProtectedRoute>} />
      <Route path="/profile/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/cert/:id" element={<Certificate />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="*" element={<div className="min-h-screen flex items-center justify-center bg-[#f5f4ed] text-[#5e5d59]">404 - 页面不存在</div>} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppInner />
      </Router>
    </ErrorBoundary>
  )
}
