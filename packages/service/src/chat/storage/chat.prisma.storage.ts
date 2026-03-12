/**
 * @file chat.prisma.storage.ts
 * @author houfujian houfujian@jd.com
 * @description 基于 SQLite(Prisma) 的会话/消息持久化，实现 IChatStorage
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  IChatStorage,
  Conversation,
  Message,
  PaginationMeta,
  PreviewStatus,
} from './chat-storage.interface';

function createId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function toConversation(row: {
  id: string;
  title: string;
  updatedAt: Date;
  hasPreview: boolean;
  previewPort: number | null;
  previewUrl: string | null;
  sandboxId: string | null;
  previewStatus: string;
  yn?: number;
}): Conversation {
  return {
    id: row.id,
    title: row.title,
    updatedAt: row.updatedAt.toISOString(),
    hasPreview: row.hasPreview,
    previewPort: row.previewPort ?? undefined,
    previewUrl: row.previewUrl ?? undefined,
    sandboxId: row.sandboxId ?? undefined,
    previewStatus: row.previewStatus as PreviewStatus,
  };
}

function toMessage(row: {
  id: string;
  role: string;
  content: string;
  contentFormat: string | null;
  createdAt: Date;
  updatedAt: Date;
  model: string | null;
  metadata: string | null;
  yn?: number;
}): Message {
  let metadata: Record<string, unknown> | undefined;
  if (row.metadata) {
    try {
      metadata = JSON.parse(row.metadata) as Record<string, unknown>;
    } catch {
      metadata = undefined;
    }
  }
  return {
    id: row.id,
    role: row.role as 'user' | 'assistant',
    content: row.content,
    contentFormat: (row.contentFormat as 'text' | 'markdown') ?? 'text',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    model: row.model ?? undefined,
    metadata,
  };
}

@Injectable()
export class ChatPrismaStorage implements IChatStorage {
  constructor(private readonly prisma: PrismaService) {}

  async createConversation(data: {
    title?: string;
    hasPreview?: boolean;
  }): Promise<Conversation> {
    const id = createId();
    const row = await this.prisma.conversation.create({
      data: {
        id,
        title: data.title ?? '新对话',
        hasPreview: data.hasPreview ?? false,
      },
    });
    return toConversation(row);
  }

  async getConversations(params: {
    page: number;
    pageSize: number;
  }): Promise<{ data: Conversation[]; meta: PaginationMeta }> {
    const [list, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { yn: 1 },
        orderBy: { updatedAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.conversation.count({ where: { yn: 1 } }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
    return {
      data: list.map(toConversation),
      meta: {
        total,
        page: params.page,
        pageSize: params.pageSize,
        totalPages,
      },
    };
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const row = await this.prisma.conversation.findFirst({
      where: { id, yn: 1 },
    });
    return row ? toConversation(row) : null;
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
    const updatePayload: {
      title?: string;
      hasPreview?: boolean;
      previewPort?: number | null;
      previewUrl?: string | null;
      sandboxId?: string | null;
      previewStatus?: string;
    } = {};
    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.hasPreview !== undefined) updatePayload.hasPreview = data.hasPreview;
    if (data.previewPort !== undefined) updatePayload.previewPort = data.previewPort;
    if (data.previewUrl !== undefined) updatePayload.previewUrl = data.previewUrl;
    if ('sandboxId' in data) updatePayload.sandboxId = data.sandboxId ?? null;
    if (data.previewStatus !== undefined)
      updatePayload.previewStatus = data.previewStatus;

    const row = await this.prisma.conversation.updateMany({
      where: { id, yn: 1 },
      data: updatePayload,
    });
    if (row.count === 0) return null;
    const updated = await this.prisma.conversation.findFirst({
      where: { id, yn: 1 },
    });
    return updated ? toConversation(updated) : null;
  }

  async deleteConversation(id: string): Promise<boolean> {
    const result = await this.prisma.conversation.updateMany({
      where: { id, yn: 1 },
      data: { yn: 0 },
    });
    return result.count > 0;
  }

  async getMessages(
    conversationId: string,
    params: { page: number; pageSize: number }
  ): Promise<{ data: Message[]; meta: PaginationMeta }> {
    const [list, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId, yn: 1 },
        orderBy: { createdAt: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.message.count({ where: { conversationId, yn: 1 } }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
    return {
      data: list.map(toMessage),
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
    const row = await this.prisma.message.findFirst({
      where: { id: messageId, conversationId, yn: 1 },
    });
    return row ? toMessage(row) : null;
  }

  async addMessage(conversationId: string, message: Message): Promise<void> {
    await this.prisma.message.create({
      data: {
        id: message.id,
        conversationId,
        role: message.role,
        content: message.content,
        contentFormat: message.contentFormat ?? 'text',
        createdAt: new Date(message.createdAt),
        updatedAt: new Date(message.updatedAt),
        model: message.model ?? null,
        metadata:
          message.metadata != null
            ? JSON.stringify(message.metadata)
            : null,
      },
    });
  }

  async updateMessage(
    conversationId: string,
    messageId: string,
    content: string
  ): Promise<Message | null> {
    const updated = await this.prisma.message.updateMany({
      where: { id: messageId, conversationId, yn: 1 },
      data: { content, updatedAt: new Date() },
    });
    if (updated.count === 0) return null;
    const row = await this.prisma.message.findFirst({
      where: { id: messageId, conversationId, yn: 1 },
    });
    return row ? toMessage(row) : null;
  }

  async deleteMessage(
    conversationId: string,
    messageId: string
  ): Promise<boolean> {
    const result = await this.prisma.message.updateMany({
      where: { id: messageId, conversationId, yn: 1 },
      data: { yn: 0 },
    });
    return result.count > 0;
  }
}
