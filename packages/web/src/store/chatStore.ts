/**
 * @file: chatStore.ts
 * @description 对话与当前会话状态（Zustand），持久化到 localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Conversation, Message } from '@/types/chat';
import type { SkillId } from '@/types/chat';

function createId() {
  return Math.random().toString(36).slice(2, 11);
}

const MOCK_CONVERSATIONS: Conversation[] = [];

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  messagesByConversationId: Record<string, Message[]>;
  selectedSkill: SkillId | null;
  setCurrentConversationId: (id: string | null) => void;
  setSelectedSkill: (skill: SkillId | null) => void;
  addConversation: (c: Conversation) => void;
  setConversations: (list: Conversation[]) => void;
  /** 按 id 更新单个会话（用于轮询预览状态等） */
  updateConversation: (id: string, data: Partial<Conversation>) => void;
  addMessage: (conversationId: string, message: Message) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  startNewChat: () => void;
  getMessages: (conversationId: string) => Message[];
}

const STORAGE_KEY = 'vibe-chat-storage';

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: MOCK_CONVERSATIONS,
      currentConversationId: null,
      messagesByConversationId: {},
      selectedSkill: null,

      setCurrentConversationId: (id) => set({ currentConversationId: id }),

      setSelectedSkill: (skill) => set({ selectedSkill: skill }),

      addConversation: (c) =>
        set((state) => ({
          conversations: [c, ...state.conversations.filter((x) => x.id !== c.id)],
        })),

      setConversations: (list) => set({ conversations: list }),

      updateConversation: (id, data) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, ...data } : c
          ),
        })),

      addMessage: (conversationId, message) =>
        set((state) => {
          const prev = state.messagesByConversationId[conversationId] ?? [];
          return {
            messagesByConversationId: {
              ...state.messagesByConversationId,
              [conversationId]: [...prev, message],
            },
          };
        }),

      setMessages: (conversationId, messages) =>
        set((state) => ({
          messagesByConversationId: {
            ...state.messagesByConversationId,
            [conversationId]: messages,
          },
        })),

      startNewChat: () => set({ currentConversationId: null }),

      getMessages: (conversationId) => get().messagesByConversationId[conversationId] ?? [],
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        conversations: state.conversations,
        messagesByConversationId: state.messagesByConversationId,
      }),
    }
  )
);

export function createNewConversation(title: string, hasPreview = false): Conversation {
  return {
    id: createId(),
    title,
    updatedAt: new Date().toISOString(),
    hasPreview,
  };
}

export function createMessage(role: Message['role'], content: string): Message {
  const now = new Date().toISOString();
  return {
    id: createId(),
    role,
    content,
    contentFormat: role === 'assistant' ? 'markdown' : 'text',
    createdAt: now,
    updatedAt: now,
  };
}
