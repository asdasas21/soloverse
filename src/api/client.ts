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

export async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  // 优先使用 JWT token 认证
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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
export const getTrials = () => fetchAPI<TrialData[]>('/trials');
export const getTrial = (id: string) => fetchAPI<TrialData>(`/trials/${id}`);
export const startTrial = (id: string) => fetchAPI<{ sessionId: string; messages: Array<{ role: string; content: string }>; turnCount: number; greeting: string }>(`/trials/${id}/start`, { method: 'POST' });

// Profile
export const getProfile = (id: string) => fetchAPI<Record<string, unknown>>(`/profile/${id}`);

// Evaluate
export const submitEvaluation = (data: { trialId: string; sessionId: string }) =>
  fetchAPI<{
    trialId: string;
    sessionId: string;
    dimensionScores: Record<string, number>;
    portrait: Record<string, number>;
    certScore: number;
    certification: { level: string; certScore: number; issuedAt: string } | null;
    report: { summary: string; strengths: string[]; improvements: string[]; evidence: Array<{ dimension: string; quote: string; comment: string }> };
    integrity: { riskScore: number; flags: string[]; suspicious: boolean };
  }>('/evaluate', { method: 'POST', body: JSON.stringify(data) });

// Certificate
export const getCertificate = (id: string) => fetchAPI<Record<string, unknown>>(`/cert/${id}`);
export const verifyCertificate = (certNumber: string) => fetchAPI<Record<string, unknown>>(`/cert/${certNumber}`);

// Commerce 类型定义
export interface Plan {
  id: string;
  name: string;
  price: number;
  priceYuan: string;
  seats: number;
  verifications: number;
  apiCalls: number;
  features: string[];
}

export interface ReportProduct {
  id: string;
  name: string;
  price: number;
  priceYuan: string;
  description: string;
}

export interface SubscriptionStatus {
  subscription: { plan: string; status: string; seats: number; expiresAt: string | null };
  usage: { allowed: boolean; used: number; limit: number };
  planDetails: Omit<Plan, 'id' | 'priceYuan'>;
}

export interface Order {
  id: string;
  orderNo: string;
  productType: string;
  productId: string;
  amount: number;
  amountYuan: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

export interface PaymentResult {
  paid: boolean;
  orderNo: string;
  productType: string;
  productId?: string;
  plan?: string;
  planName?: string;
  expiresAt?: string;
  nextStep?: string | null;
}

export interface ReportPurchase {
  id: string;
  reportType: string;
  reportName: string;
  createdAt: string;
}

export interface UsageStats {
  apiCalls: { allowed: boolean; used: number; limit: number };
  verifications: { allowed: boolean; used: number; limit: number };
  dailyBreakdown: Record<string, number>;
  endpointBreakdown: Record<string, number>;
  billingPeriod: string;
}

// Commerce — 订阅与支付
export const getPlans = () => fetchAPI<{ plans: Plan[]; reports: ReportProduct[] }>('/commerce/plans');
export const getSubscription = () => fetchAPI<SubscriptionStatus>('/commerce/subscription');
export const createOrder = (productType: string, productId: string) => fetchAPI<Order>('/commerce/orders', {
  method: 'POST',
  body: JSON.stringify({ productType, productId }),
});
export const payOrder = (orderId: string) => fetchAPI<PaymentResult>(`/commerce/orders/${orderId}/pay`, { method: 'POST' });
export const getOrders = () => fetchAPI<Order[]>('/commerce/orders');
export const generateReport = (reportType: string, evaluationId?: string) => fetchAPI<{ reportType: string; content: Record<string, unknown>; cached: boolean }>(`/commerce/reports/${reportType}/generate`, {
  method: 'POST',
  body: JSON.stringify({ evaluationId }),
});
export const getReports = () => fetchAPI<ReportPurchase[]>('/commerce/reports');
export const getReport = (type: string) => fetchAPI<{ id: string; reportType: string; content: Record<string, unknown> }>(`/commerce/reports/${type}`);
export const getUsage = () => fetchAPI<UsageStats>('/commerce/usage');
