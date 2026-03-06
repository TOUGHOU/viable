/**
 * @file chat-storage.interface.ts
 * @author houfujian houfujian@jd.com
 * @description 会话与消息存储抽象，本期实现为文件存储，后续可替换为 DB
 */

export type PreviewStatus = 'pending' | 'running' | 'failed';

export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  hasPreview?: boolean;
  /** 预览进程端口，启动成功后写入 */
  previewPort?: number;
  /** 预览地址，本期为 http://localhost:${previewPort} */
  previewUrl?: string;
  /** 预览状态：pending 启动中，running 已就绪，failed 启动失败 */
  previewStatus?: PreviewStatus;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  contentFormat?: 'text' | 'markdown';
  createdAt: string;
  updatedAt: string;
  model?: string;
  metadata?: Record<string, unknown>;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IChatStorage {
  createConversation(data: {
    title?: string;
    hasPreview?: boolean;
  }): Promise<Conversation>;

  getConversations(params: {
    page: number;
    pageSize: number;
  }): Promise<{ data: Conversation[]; meta: PaginationMeta }>;

  getConversation(id: string): Promise<Conversation | null>;

  updateConversation(
    id: string,
    data: {
      title?: string;
      hasPreview?: boolean;
      previewPort?: number;
      previewUrl?: string;
      previewStatus?: PreviewStatus;
    }
  ): Promise<Conversation | null>;

  deleteConversation(id: string): Promise<boolean>;

  getMessages(
    conversationId: string,
    params: { page: number; pageSize: number }
  ): Promise<{ data: Message[]; meta: PaginationMeta }>;

  getMessage(
    conversationId: string,
    messageId: string
  ): Promise<Message | null>;

  addMessage(conversationId: string, message: Message): Promise<void>;

  updateMessage(
    conversationId: string,
    messageId: string,
    content: string
  ): Promise<Message | null>;

  deleteMessage(
    conversationId: string,
    messageId: string
  ): Promise<boolean>;
}
