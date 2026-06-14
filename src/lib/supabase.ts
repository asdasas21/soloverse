import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xchiihqrfwfzuehfiakt.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjaGlpaHFyZndmenVlaGZpYWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMzk0MTgsImV4cCI6MjA5NjkxNTQxOH0.z0c985-GD6dn-l0i_HhtiXUo8Mw5-1DuV5mhiPvQfTk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

export type UserRole = 'talent' | 'enterprise'

export type Profile = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string
  title: string
  role: UserRole
}
