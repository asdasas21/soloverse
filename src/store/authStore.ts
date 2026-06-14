import { create } from 'zustand'
import { supabase, type Profile, type UserRole } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  initialized: boolean
  isEnterprise: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, username: string, role?: UserRole) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: false,
  initialized: false,
  isEnterprise: false,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()
      set({ user: session.user, profile, initialized: true, isEnterprise: profile?.role === 'enterprise' })
      localStorage.setItem('talentx_user_id', session.user.id)
    } else {
      set({ initialized: true })
    }
  },

  signIn: async (email, password) => {
    set({ loading: true })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ loading: false })
      return { error: error.message }
    }
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle()
      set({ user: data.user, profile, loading: false, isEnterprise: profile?.role === 'enterprise' })
      localStorage.setItem('talentx_user_id', data.user.id)
    }
    set({ loading: false })
    return { error: null }
  },

  signUp: async (email, password, username, _role = 'talent') => {
    set({ loading: true })
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, display_name: username } },
    })
    if (error) {
      set({ loading: false })
      return { error: error.message }
    }
    if (data.user) {
      // 触发器会自动创建 profile（role 默认 talent）
      // role 不应由客户端控制，防止角色提权
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle()
      set({ user: data.user, profile, loading: false, isEnterprise: profile?.role === 'enterprise' })
      localStorage.setItem('talentx_user_id', data.user.id)
    }
    set({ loading: false })
    return { error: null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('talentx_user_id')
    set({ user: null, profile: null, isEnterprise: false })
  },
}))
