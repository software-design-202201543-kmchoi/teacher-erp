import { create } from "zustand"

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface ChatState {
  messagesByStudent: Record<string, ChatMessage[]>
  addMessage: (studentId: string, msg: ChatMessage) => void
  clearMessages: (studentId: string) => void
}

export const useChatStore = create<ChatState>((set) => ({
  messagesByStudent: {},
  addMessage: (studentId, msg) =>
    set((state) => ({
      messagesByStudent: {
        ...state.messagesByStudent,
        [studentId]: [...(state.messagesByStudent[studentId] ?? []), msg],
      },
    })),
  clearMessages: (studentId) =>
    set((state) => ({
      messagesByStudent: { ...state.messagesByStudent, [studentId]: [] },
    })),
}))
