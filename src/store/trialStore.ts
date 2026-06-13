import { create } from "zustand";

export interface TrialCard {
  id: string;
  title: string;
  description: string;
  type: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  duration: string;
  participants: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
}

export interface TrialSession {
  trialId: string;
  status: "active" | "completed" | "submitted";
  startedAt: number;
  currentStep: number;
  steps: string[];
}

interface TrialState {
  currentMessages: ChatMessage[];
  isTyping: boolean;
  trialSessions: Record<string, TrialSession>;
  addMessage: (role: "user" | "agent", content: string) => void;
  setTyping: (typing: boolean) => void;
  submitCode: (sessionId: string, codeUrl: string) => void;
  initSession: (trialId: string) => void;
}

export const TRIALS: TrialCard[] = [
  {
    id: "hackathon-1",
    title: "AI Agent 黑客松",
    description: "48小时内完成一个AI Agent项目",
    type: "hackathon",
    difficulty: "intermediate",
    duration: "48小时",
    participants: 128,
  },
  {
    id: "rag-1",
    title: "RAG 系统搭建",
    description: "构建检索增强生成系统",
    type: "hackathon",
    difficulty: "advanced",
    duration: "24小时",
    participants: 67,
  },
  {
    id: "review-1",
    title: "代码审查挑战",
    description: "审查并改进生产级代码",
    type: "code_review",
    difficulty: "beginner",
    duration: "4小时",
    participants: 256,
  },
];

export const useTrialStore = create<TrialState>((set) => ({
  currentMessages: [],
  isTyping: false,
  trialSessions: {},
  addMessage: (role, content) =>
    set((state) => ({
      currentMessages: [
        ...state.currentMessages,
        { id: crypto.randomUUID(), role, content, timestamp: Date.now() },
      ],
    })),
  setTyping: (typing) => set({ isTyping: typing }),
  submitCode: (sessionId, codeUrl: string) => {
    void codeUrl;
    return set((state) => ({
      trialSessions: {
        ...state.trialSessions,
        [sessionId]: {
          ...(state.trialSessions[sessionId] || {}),
          status: "submitted",
        } as TrialSession,
      },
    }));
  },
  initSession: (trialId) =>
    set((state) => {
      if (state.trialSessions[trialId]) return state;
      return {
        currentMessages: [
          {
            id: crypto.randomUUID(),
            role: "agent",
            content:
              "欢迎来到试炼！我是你的试炼导师。在接下来的挑战中，我会实时观察你的表现并评估你的能力。准备好了吗？",
            timestamp: Date.now(),
          },
        ],
        trialSessions: {
          ...state.trialSessions,
          [trialId]: {
            trialId,
            status: "active",
            startedAt: Date.now(),
            currentStep: 0,
            steps: ["开始", "编码中", "提交", "评审"],
          },
        },
      };
    }),
}));
