/**
 * @file chat.file.storage.ts
 * @author houfujian houfujian@jd.com
 * @description 基于文件的会话/消息持久化（已弃用，当前使用 ChatPrismaStorage + SQLite）
 * 先写临时文件再 rename 避免写坏
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  IChatStorage,
  Conversation,
  Message,
  PaginationMeta,
  PreviewStatus,
} from './chat-storage.interface';

const CONVERSATIONS_FILE = 'conversations.json';
const MESSAGES_DIR = 'messages';

function createId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export class ChatFileStorage implements IChatStorage {
  private readonly root: string;

  constructor() {
    this.root =
      process.env.CHAT_STORAGE_PATH ??
      path.resolve(process.cwd(), 'data', 'chat');
  }

  private async ensureDir(dir: string): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
  }

  private getConversationsPath(): string {
    return path.join(this.root, CONVERSATIONS_FILE);
  }

  private getMessagesPath(conversationId: string): string {
    return path.join(this.root, MESSAGES_DIR, `${conversationId}.json`);
  }

  private async writeJson(filePath: string, data: unknown): Promise<void> {
    await this.ensureDir(path.dirname(filePath));
    const tmpPath = `${filePath}.${Date.now()}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tmpPath, filePath);
  }

  private async readJson<T>(filePath: string, defaultValue: T): Promise<T> {
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  }

  async createConversation(data: {
    title?: string;
    hasPreview?: boolean;
  }): Promise<Conversation> {
    await this.ensureDir(this.root);
    const conversationsPath = this.getConversationsPath();
    const list = await this.readJson<Conversation[]>(conversationsPath, []);
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: createId(),
      title: data.title ?? '新对话',
      updatedAt: now,
      hasPreview: data.hasPreview ?? false,
      previewStatus: 'pending',
    };
    list.unshift(conversation);
    await this.writeJson(conversationsPath, list);
    return conversation;
  }

  async getConversations(params: {
    page: number;
    pageSize: number;
  }): Promise<{ data: Conversation[]; meta: PaginationMeta }> {
    const conversationsPath = this.getConversationsPath();
    const list = await this.readJson<Conversation[]>(conversationsPath, []);
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
    const start = (params.page - 1) * params.pageSize;
    const data = list.slice(start, start + params.pageSize);
    return {
      data,
      meta: {
        total,
        page: params.page,
        pageSize: params.pageSize,
        totalPages,
      },
    };
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const list = await this.readJson<Conversation[]>(
      this.getConversationsPath(),
      []
    );
    return list.find((c) => c.id === id) ?? null;
  }

  async updateConversation(
    id: string,
    data: {
      title?: string;
      hasPreview?: boolean;
      previewPort?: number;
      previewUrl?: string;
      sandboxId?: string;
      previewStatus?: PreviewStatus;
    }
  ): Promise<Conversation | null> {
    const conversationsPath = this.getConversationsPath();
    const list = await this.readJson<Conversation[]>(conversationsPath, []);
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    list[idx] = {
      ...list[idx],
      ...(data.title !== undefined && { title: data.title }),
      ...(data.hasPreview !== undefined && { hasPreview: data.hasPreview }),
      ...(data.previewPort !== undefined && { previewPort: data.previewPort }),
      ...(data.previewUrl !== undefined && { previewUrl: data.previewUrl }),
      ...(data.sandboxId !== undefined && { sandboxId: data.sandboxId }),
      ...(data.previewStatus !== undefined && { previewStatus: data.previewStatus }),
      updatedAt: now,
    };
    await this.writeJson(conversationsPath, list);
    return list[idx];
  }

  async deleteConversation(id: string): Promise<boolean> {
    const conversationsPath = this.getConversationsPath();
    const list = await this.readJson<Conversation[]>(conversationsPath, []);
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    list.splice(idx, 1);
    await this.writeJson(conversationsPath, list);
    const messagesPath = this.getMessagesPath(id);
    try {
      await fs.unlink(messagesPath);
    } catch {
      // ignore if file not found
    }
    return true;
  }

  async getMessages(
    conversationId: string,
    params: { page: number; pageSize: number }
  ): Promise<{ data: Message[]; meta: PaginationMeta }> {
    const messagesPath = this.getMessagesPath(conversationId);
    const list = await this.readJson<Message[]>(messagesPath, []);
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
    const start = (params.page - 1) * params.pageSize;
    const data = list.slice(start, start + params.pageSize);
    return {
      data,
      meta: {
        total,
        page: params.page,
        pageSize: params.pageSize,
        totalPages,
      },
    };
  }

  async getMessage(
    conversationId: string,
    messageId: string
  ): Promise<Message | null> {
    const messagesPath = this.getMessagesPath(conversationId);
    const list = await this.readJson<Message[]>(messagesPath, []);
    return list.find((m) => m.id === messageId) ?? null;
  }

  async addMessage(conversationId: string, message: Message): Promise<void> {
    const messagesPath = this.getMessagesPath(conversationId);
    const list = await this.readJson<Message[]>(messagesPath, []);
    list.push(message);
    await this.writeJson(messagesPath, list);
  }

  async updateMessage(
    conversationId: string,
    messageId: string,
    content: string
  ): Promise<Message | null> {
    const messagesPath = this.getMessagesPath(conversationId);
    const list = await this.readJson<Message[]>(messagesPath, []);
    const idx = list.findIndex((m) => m.id === messageId);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    list[idx] = { ...list[idx], content, updatedAt: now };
    await this.writeJson(messagesPath, list);
    return list[idx];
  }

  async deleteMessage(
    conversationId: string,
    messageId: string
  ): Promise<boolean> {
    const messagesPath = this.getMessagesPath(conversationId);
    const list = await this.readJson<Message[]>(messagesPath, []);
    const idx = list.findIndex((m) => m.id === messageId);
    if (idx === -1) return false;
    list.splice(idx, 1);
    await this.writeJson(messagesPath, list);
    return true;
  }
}
