/**
 * @file chat-storage.interface.ts
 * @author houfujian houfujian@jd.com
 * @description 项目与消息存储抽象，支持用户、项目、版本、对话消息
 */

export type PreviewStatus = 'pending' | 'running' | 'failed';

/** 用户（匿名或登录），用于项目限额等 */
export interface User {
  id: string;
  createdAt: number;
  lastSeenAt: number;
  projectLimit: number;
  yn: number;
  deletedAt?: number | null;
}

/** 项目：一次对话对应一个项目 */
export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  templateId?: string | null;
  framework: string;
  styling: string;
  currentVersionId?: string | null;
  createdAt: number;
  updatedAt: number;
  hasPreview: boolean;
  previewPort?: number | null;
  previewUrl?: string | null;
  sandboxId?: string | null;
  previewStatus: PreviewStatus;
}

/** 对话消息：支持多种 messageType，assistant 可能关联 versionId */
export interface ChatMessage {
  id: string;
  projectId: string;
  conversationId: string;
  parentId?: string | null;
  role: 'user' | 'assistant' | 'system';
  messageType: string;
  contentText?: string | null;
  contentJson?: string | null;
  metadata?: string | null;
  versionId?: string | null;
  status: string;
  createdAt: number;
  updatedAt: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IProjectStorage {
  /** 获取或创建用户（匿名默认用户） */
  getOrCreateUser(userId?: string): Promise<User>;

  createProject(data: {
    userId: string;
    name?: string;
    description?: string | null;
    templateId?: string | null;
    framework?: string;
    styling?: string;
    hasPreview?: boolean;
  }): Promise<Project>;

  getProjects(
    userId: string,
    params: { page: number; pageSize: number }
  ): Promise<{ data: Project[]; meta: PaginationMeta }>;

  getProject(id: string): Promise<Project | null>;

  updateProject(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      hasPreview?: boolean;
      previewPort?: number | null;
      previewUrl?: string | null;
      sandboxId?: string | null;
      previewStatus?: PreviewStatus;
      currentVersionId?: string | null;
    }
  ): Promise<Project | null>;

  deleteProject(id: string): Promise<boolean>;

  getMessages(
    projectId: string,
    params: { page: number; pageSize: number }
  ): Promise<{ data: ChatMessage[]; meta: PaginationMeta }>;

  getMessage(projectId: string, messageId: string): Promise<ChatMessage | null>;

  addMessage(projectId: string, message: ChatMessage): Promise<void>;

  updateMessage(
    projectId: string,
    messageId: string,
    content: string
  ): Promise<ChatMessage | null>;

  deleteMessage(projectId: string, messageId: string): Promise<boolean>;
}
