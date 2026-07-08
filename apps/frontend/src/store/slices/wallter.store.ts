import { create } from 'zustand';
import type { ChatMessage } from '@/features/assistant/types';

/**
 * Global Wallter chat state (module singleton) so the conversation survives the
 * drawer being closed and page navigation (DashboardLayout remounts per page).
 * Transient UI state (input text, elapsed timer) stays local to the drawer.
 */
type WallterState = {
  isOpen: boolean;
  messages: ChatMessage[];
  activeSessionId: string | null;
  loading: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setLoading: (value: boolean) => void;
  appendMessage: (message: ChatMessage) => void;
  setActiveSessionId: (sessionId: string | null) => void;
  resetConversation: () => void;
};

export const useWallterStore = create<WallterState>((set) => ({
  isOpen: false,
  messages: [],
  activeSessionId: null,
  loading: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setLoading: (value) => set({ loading: value }),
  appendMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setActiveSessionId: (sessionId) => set({ activeSessionId: sessionId }),
  resetConversation: () => set({ messages: [], activeSessionId: null }),
}));
