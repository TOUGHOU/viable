/**
 * @file: chatStore.ts
 * @description 对话与当前会话状态（Zustand）
 */

import { create } from 'zustand';
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
  addMessage: (conversationId: string, message: Message) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  startNewChat: () => void;
  getMessages: (conversationId: string) => Message[];
}

export const useChatStore = create<ChatState>((set, get) => ({
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
}));

export function createNewConversation(title: string, hasPreview = false): Conversation {
  return {
    id: createId(),
    title,
    updatedAt: new Date().toISOString(),
    hasPreview,
  };
}

export function createMessage(role: Message['role'], content: string): Message {
  return {
    id: createId(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}
