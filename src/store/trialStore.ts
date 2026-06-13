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

interface TrialState {
  currentMessages: ChatMessage[];
  isTyping: boolean;
  addMessage: (role: "user" | "agent", content: string) => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
  setTyping: (typing: boolean) => void;
}

export const useTrialStore = create<TrialState>((set) => ({
  currentMessages: [],
  isTyping: false,
  addMessage: (role, content) =>
    set((state) => ({
      currentMessages: [
        ...state.currentMessages,
        { id: crypto.randomUUID(), role, content, timestamp: Date.now() },
      ],
    })),
  setMessages: (messages) => set({ currentMessages: messages }),
  clearMessages: () => set({ currentMessages: [] }),
  setTyping: (typing) => set({ isTyping: typing }),
}));
