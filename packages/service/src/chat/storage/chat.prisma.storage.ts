/**
 * @file: chat.prisma.storage.ts
 * @author houfujian houfujian@jd.com
 * @description 基于 SQLite(Prisma) 的项目与消息持久化，实现 IProjectStorage
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  IProjectStorage,
  Project,
  ChatMessage,
  ChatMessageToolCall,
  ChatMessageStatus,
  PartsMessageContent,
  PaginationMeta,
  PreviewStatus,
  User,
} from './chat-storage.interface';

const DEFAULT_USER_ID = 'default';

function createId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function nowMs(): number {
  return Date.now();
}

function toUser(row: {
  id: string;
  createdAt: number;
  lastSeenAt: number;
  projectLimit: number;
  yn: number;
  deletedAt: number | null;
}): User {
  return {
    id: row.id,
    createdAt: row.createdAt,
    lastSeenAt: row.lastSeenAt,
    projectLimit: row.projectLimit,
    yn: row.yn,
    deletedAt: row.deletedAt ?? undefined,
  };
}

function toProject(row: {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  templateId: string | null;
  framework: string;
  styling: string;
  currentVersionId: string | null;
  createdAt: number;
  updatedAt: number;
  hasPreview: boolean;
  previewPort: number | null;
  previewUrl: string | null;
  sandboxId: string | null;
  previewStatus: string;
}): Project {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    description: row.description ?? undefined,
    templateId: row.templateId ?? undefined,
    framework: row.framework,
    styling: row.styling,
    currentVersionId: row.currentVersionId ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    hasPreview: row.hasPreview,
    previewPort: row.previewPort ?? undefined,
    previewUrl: row.previewUrl ?? undefined,
    sandboxId: row.sandboxId ?? undefined,
    previewStatus: row.previewStatus as PreviewStatus,
  };
}

function toChatMessage(row: {
  id: string;
  projectId: string;
  conversationId: string;
  parentId: string | null;
  role: string;
  messageType: string;
  contentText: string | null;
  contentParts: string | null;
  metadata: string | null;
  versionId: string | null;
  status: string;
  createdAt: number;
  updatedAt: number;
  toolCalls?: Array<{
    id: string;
    toolCallId: string;
    toolName: string;
    argumentsJson: string | null;
    success: boolean;
    resultSummary: string | null;
  }>;
}): ChatMessage {
  if (row.messageType === 'parts') {
    let parts: PartsMessageContent['parts'] = [];
    if (row.contentParts != null) {
      try {
        const parsed = JSON.parse(row.contentParts) as { parts?: PartsMessageContent['parts'] };
        if (Array.isArray(parsed.parts)) {
          parts = parsed.parts;
        }
      } catch {
        parts = [];
      }
    }
    return {
      id: row.id,
      projectId: row.projectId,
      conversationId: row.conversationId,
      parentId: row.parentId ?? undefined,
      role: row.role as 'user' | 'assistant' | 'system',
      messageType: 'parts',
      content: { kind: 'parts', parts },
      metadata: row.metadata ?? undefined,
      versionId: row.versionId ?? undefined,
      status: row.status as ChatMessageStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  const toolCalls =
    row.toolCalls && row.toolCalls.length > 0
      ? row.toolCalls.map((toolCall) => {
          let argumentsValue: Record<string, unknown> | undefined;
          if (toolCall.argumentsJson) {
            try {
              argumentsValue = JSON.parse(toolCall.argumentsJson) as Record<string, unknown>;
            } catch {
              argumentsValue = undefined;
            }
          }
          return {
            id: toolCall.toolCallId,
            name: toolCall.toolName,
            arguments: argumentsValue,
            success: toolCall.success,
            resultSummary: toolCall.resultSummary ?? undefined,
          } satisfies ChatMessageToolCall;
        })
      : undefined;
  return {
    id: row.id,
    projectId: row.projectId,
    conversationId: row.conversationId,
    parentId: row.parentId ?? undefined,
    role: row.role as 'user' | 'assistant' | 'system',
    messageType: row.messageType === 'markdown' ? 'markdown' : 'text',
    content: {
      kind: 'text',
      format: row.messageType === 'markdown' ? 'markdown' : 'text',
      text: row.contentText ?? '',
      toolCalls,
    },
    metadata: row.metadata ?? undefined,
    versionId: row.versionId ?? undefined,
    status: row.status as ChatMessageStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class ChatPrismaStorage implements IProjectStorage {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateUser(userId?: string): Promise<User> {
    const id = userId ?? DEFAULT_USER_ID;
    const row = await this.prisma.user.findFirst({
      where: { id, yn: 1 },
    });
    if (row) {
      await this.prisma.user.updateMany({
        where: { id },
        data: { lastSeenAt: nowMs() },
      });
      return toUser({ ...row, deletedAt: row.deletedAt });
    }
    const now = nowMs();
    const created = await this.prisma.user.create({
      data: {
        id,
        createdAt: now,
        lastSeenAt: now,
        projectLimit: 1,
        yn: 1,
      },
    });
    return toUser(created);
  }

  async createProject(data: {
    userId: string;
    name?: string;
    description?: string | null;
    templateId?: string | null;
    framework?: string;
    styling?: string;
    hasPreview?: boolean;
  }): Promise<Project> {
    const id = createId();
    const now = nowMs();
    const row = await this.prisma.project.create({
      data: {
        id,
        userId: data.userId,
        name: data.name ?? '新项目',
        description: data.description ?? null,
        templateId: data.templateId ?? null,
        framework: data.framework ?? 'react',
        styling: data.styling ?? 'tailwind',
        createdAt: now,
        updatedAt: now,
        hasPreview: data.hasPreview ?? false,
        previewStatus: 'pending',
      },
    });
    return toProject(row);
  }

  async getProjects(
    userId: string,
    params: { page: number; pageSize: number }
  ): Promise<{ data: Project[]; meta: PaginationMeta }> {
    const [list, total] = await Promise.all([
      this.prisma.project.findMany({
        where: { userId, yn: 1 },
        orderBy: { updatedAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.project.count({ where: { userId, yn: 1 } }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
    return {
      data: list.map(toProject),
      meta: {
        total,
        page: params.page,
        pageSize: params.pageSize,
        totalPages,
      },
    };
  }

  async getProject(id: string): Promise<Project | null> {
    const row = await this.prisma.project.findFirst({
      where: { id, yn: 1 },
    });
    return row ? toProject(row) : null;
  }

  async updateProject(
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
  ): Promise<Project | null> {
    const updatePayload: Record<string, unknown> = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.previewPort !== undefined) updatePayload.previewPort = data.previewPort;
    if (data.previewUrl !== undefined) updatePayload.previewUrl = data.previewUrl;
    if (data.sandboxId !== undefined) updatePayload.sandboxId = data.sandboxId;
    if (data.previewStatus !== undefined) updatePayload.previewStatus = data.previewStatus;
    if (data.currentVersionId !== undefined) updatePayload.currentVersionId = data.currentVersionId;
    if (data.hasPreview !== undefined) updatePayload.hasPreview = data.hasPreview;
    updatePayload.updatedAt = nowMs();

    const result = await this.prisma.project.updateMany({
      where: { id, yn: 1 },
      data: updatePayload as never,
    });
    if (result.count === 0) return null;
    const row = await this.prisma.project.findFirst({
      where: { id, yn: 1 },
    });
    return row ? toProject(row) : null;
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await this.prisma.project.updateMany({
      where: { id, yn: 1 },
      data: { yn: 0, deletedAt: nowMs() },
    });
    return result.count > 0;
  }

  async getMessages(
    projectId: string,
    params: { page: number; pageSize: number }
  ): Promise<{ data: ChatMessage[]; meta: PaginationMeta }> {
    const [list, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { projectId, yn: 1 },
        orderBy: { createdAt: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        include: {
          toolCalls: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.chatMessage.count({ where: { projectId, yn: 1 } }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
    return {
      data: list.map(toChatMessage),
      meta: {
        total,
        page: params.page,
        pageSize: params.pageSize,
        totalPages,
      },
    };
  }

  async getMessage(projectId: string, messageId: string): Promise<ChatMessage | null> {
    const row = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, projectId, yn: 1 },
      include: {
        toolCalls: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return row ? toChatMessage(row) : null;
  }

  async addMessage(projectId: string, message: ChatMessage): Promise<void> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, yn: 1 },
    });
    if (!project) return;
    await this.prisma.chatMessage.create({
      data: {
        id: message.id,
        projectId,
        conversationId: message.conversationId,
        parentId: message.parentId ?? null,
        role: message.role,
        messageType: message.messageType,
        contentText: message.content.kind === 'text' ? message.content.text : null,
        contentParts:
          message.content.kind === 'parts'
            ? JSON.stringify({ parts: message.content.parts })
            : null,
        metadata: message.metadata ?? null,
        versionId: message.versionId ?? null,
        status: message.status,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        toolCalls:
          message.content.kind === 'text' && message.content.toolCalls?.length
            ? {
                create: message.content.toolCalls.map((toolCall) => ({
                  id: createId(),
                  toolCallId: toolCall.id,
                  toolName: toolCall.name,
                  argumentsJson: toolCall.arguments ? JSON.stringify(toolCall.arguments) : null,
                  success: toolCall.success,
                  resultSummary: toolCall.resultSummary ?? null,
                  createdAt: message.createdAt,
                  updatedAt: message.updatedAt,
                })),
              }
            : undefined,
      },
    });
    await this.prisma.project.updateMany({
      where: { id: projectId, yn: 1 },
      data: { updatedAt: message.updatedAt },
    });
  }

  async updateMessage(
    projectId: string,
    messageId: string,
    content: string
  ): Promise<ChatMessage | null> {
    const now = nowMs();
    const current = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, projectId, yn: 1 },
    });
    if (!current) return null;
    const result = await this.prisma.chatMessage.updateMany({
      where: { id: messageId, projectId, yn: 1 },
      data: {
        messageType: current.messageType === 'markdown' ? 'markdown' : 'text',
        contentText: content,
        updatedAt: now,
      },
    });
    if (result.count === 0) return null;
    const row = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, projectId, yn: 1 },
      include: {
        toolCalls: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return row ? toChatMessage(row) : null;
  }

  async deleteMessage(projectId: string, messageId: string): Promise<boolean> {
    const result = await this.prisma.chatMessage.updateMany({
      where: { id: messageId, projectId, yn: 1 },
      data: { yn: 0, deletedAt: nowMs() },
    });
    return result.count > 0;
  }
}
