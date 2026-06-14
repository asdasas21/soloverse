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

// ── 任务协作 ──

export interface Task {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  status: 'open' | 'in_review' | 'in_progress' | 'completed' | 'cancelled';
  category: string;
  max_builders: number;
  reward_total: number;
  deposit_ratio: number;
  required_cert_level: string | null;
  apply_deadline: string | null;
  submit_deadline: string | null;
  creator_id: string;
  created_at: string;
  creator?: { display_name: string; avatar_url: string | null; title: string };
}

export interface TaskApplication {
  id: string;
  task_id: string;
  builder_id: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  builder?: { display_name: string; avatar_url: string | null; title: string };
}

export interface TaskSubmission {
  id: string;
  task_id: string;
  builder_id: string;
  content: string;
  status: 'submitted' | 'approved' | 'rejected' | 'revision_requested';
  feedback: string | null;
  reward_amount: number | null;
  created_at: string;
  builder?: { display_name: string; avatar_url: string | null; title: string };
}

export interface TaskReview {
  id: string;
  task_id: string;
  builder_id: string;
  professionalism: number;
  communication: number;
  quality: number;
  timeliness: number;
  comment: string | null;
  created_at: string;
  reviewer?: { display_name: string; avatar_url: string | null };
}

// 任务 API
export const getTasks = (status?: string) => 
  fetchAPI<{ tasks: Task[] }>(`/tasks${status ? `?status=${status}` : ''}`);

export const getTask = (id: string) => 
  fetchAPI<Task>(`/tasks/${id}`);

export const createTask = (data: {
  title: string;
  description: string;
  requirements?: string;
  maxBuilders?: number;
  rewardTotal?: number;
  depositRatio?: number;
  category?: string;
  requiredCertLevel?: string | null;
}) => fetchAPI<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) });

export const applyForTask = (taskId: string, message?: string) => 
  fetchAPI<TaskApplication>(`/tasks/${taskId}/apply`, { method: 'POST', body: JSON.stringify({ message }) });

export const getTaskApplications = (taskId: string) => 
  fetchAPI<TaskApplication[]>(`/tasks/${taskId}/applications`);

export const reviewApplication = (taskId: string, appId: string, status: 'approved' | 'rejected') => 
  fetchAPI<TaskApplication>(`/tasks/${taskId}/applications/${appId}`, { method: 'PATCH', body: JSON.stringify({ status }) });

export const submitTaskWork = (taskId: string, content: string) => 
  fetchAPI<TaskSubmission>(`/tasks/${taskId}/submit`, { method: 'POST', body: JSON.stringify({ content }) });

export const getTaskSubmissions = (taskId: string) => 
  fetchAPI<TaskSubmission[]>(`/tasks/${taskId}/submissions`);

export const reviewSubmission = (taskId: string, subId: string, data: { status: string; feedback?: string; rewardAmount?: number }) => 
  fetchAPI<TaskSubmission>(`/tasks/${taskId}/submissions/${subId}`, { method: 'PATCH', body: JSON.stringify(data) });

export const submitReview = (taskId: string, builderId: string, data: { professionalism: number; communication: number; quality: number; timeliness: number; comment?: string }) => 
  fetchAPI(`/tasks/${taskId}/reviews`, { method: 'POST', body: JSON.stringify({ builderId, ...data }) });

export const getMyParticipatedTasks = () => 
  fetchAPI(`/tasks/my/participated`);

export const getMyCreatedTasks = () => 
  fetchAPI(`/tasks/my/created`);

export const getMyReviews = () => 
  fetchAPI(`/tasks/my/reviews`);
