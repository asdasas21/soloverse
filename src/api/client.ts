import { supabase } from '@/lib/supabase';

const API_BASE = '/api';

export interface AgentPersona {
  name: string;
  title: string;
  avatar: string;
  personality: string;
  systemPromptSuffix: string;
}

export interface TrialData {
  id: string;
  title: string;
  description: string;
  type: string;
  difficulty: string;
  duration: string;
  participants: number;
  status: string;
  agentPersona?: AgentPersona;
}

/** 获取当前用户的 Supabase access token */
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

function getUserId(): string {
  return localStorage.getItem('talentx_user_id') || '';
}

export async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  // 优先使用 JWT token 认证
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // 兼容：同时传 user-id（后续可移除）
  const uid = getUserId();
  if (uid) {
    headers['x-user-id'] = uid;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options?.headers as Record<string, string> },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API Error: ${res.status}`);
  }
  return res.json();
}

// Trials
export const getTrials = () => fetchAPI<any[]>('/trials');
export const getTrial = (id: string) => fetchAPI<any>(`/trials/${id}`);
export const startTrial = (id: string) => fetchAPI<any>(`/trials/${id}/start`, { method: 'POST' });

// Profile
export const getProfile = (id: string) => fetchAPI<any>(`/profile/${id}`);

// Evaluate
export const submitEvaluation = (data: any) => fetchAPI<any>('/evaluate', {
  method: 'POST',
  body: JSON.stringify(data),
});

// Certificate
export const getCertificate = (id: string) => fetchAPI<any>(`/cert/${id}`);
export const verifyCertificate = (certNumber: string) => fetchAPI<any>(`/cert/${certNumber}`);
