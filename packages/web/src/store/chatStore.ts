/**
 * @file: chatStore.ts
 * @description 项目与当前项目状态（Zustand），持久化到 localStorage；一次对话即一个项目
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, Message } from '@/types/chat';
import type { SkillId } from '@/types/chat';

function createId() {
  return Math.random().toString(36).slice(2, 11);
}

interface ChatState {
  projects: Project[];
  currentProjectId: string | null;
  messagesByProjectId: Record<string, Message[]>;
  selectedSkill: SkillId | null;
  setCurrentProjectId: (id: string | null) => void;
  setSelectedSkill: (skill: SkillId | null) => void;
  addProject: (p: Project) => void;
  setProjects: (list: Project[]) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  addMessage: (projectId: string, message: Message) => void;
  setMessages: (projectId: string, messages: Message[]) => void;
  startNewChat: () => void;
  getMessages: (projectId: string) => Message[];
}

const STORAGE_KEY = 'vibe-chat-storage';

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProjectId: null,
      messagesByProjectId: {},
      selectedSkill: null,

      setCurrentProjectId: (id) => set({ currentProjectId: id }),

      setSelectedSkill: (skill) => set({ selectedSkill: skill }),

      addProject: (p) =>
        set((state) => ({
          projects: [p, ...state.projects.filter((x) => x.id !== p.id)],
        })),

      setProjects: (list) => set({ projects: list }),

      updateProject: (id, data) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
        })),

      addMessage: (projectId, message) =>
        set((state) => {
          const prev = state.messagesByProjectId[projectId] ?? [];
          return {
            messagesByProjectId: {
              ...state.messagesByProjectId,
              [projectId]: [...prev, message],
            },
          };
        }),

      setMessages: (projectId, messages) =>
        set((state) => ({
          messagesByProjectId: {
            ...state.messagesByProjectId,
            [projectId]: messages,
          },
        })),

      startNewChat: () => set({ currentProjectId: null }),

      getMessages: (projectId) => get().messagesByProjectId[projectId] ?? [],
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        projects: state.projects,
        messagesByProjectId: state.messagesByProjectId,
      }),
    }
  )
);

export function createNewProject(name: string, hasPreview = false): Project {
  return {
    id: createId(),
    name,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
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
