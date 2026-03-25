/**
 * @file: chat.service.ts
 * @author houfujian houfujian@jd.com
 * @description 项目与消息业务逻辑，委托存储层 CRUD；一次对话即一个项目，assistant 消息不一定产生版本
 */

import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ProjectLimitExceededException } from './exception';
import { MessageNotFoundException, ProjectNotFoundException } from './exception';
import type { Response } from 'express';
import type {
  IProjectStorage,
  Project,
  ChatMessage,
  PreviewStatus,
} from './storage/chat-storage.interface';
import type { SendMessageParams } from './sendMessage.type';
import type { ToolCallRecord } from './messageContent.type';
import { LlmService } from '../llm/llm.service';
import { SandboxService } from '../llm/sandbox/sandbox.service';
import { PreviewService } from '../preview/preview.service';

function createId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function nowMs(): number {
  return Date.now();
}

@Injectable()
export class ChatService {
  constructor(
    @Inject('IProjectStorage') private readonly storage: IProjectStorage,
    private readonly llmService: LlmService,
    private readonly previewService: PreviewService,
    private readonly sandboxService: SandboxService
  ) {}

  async createProject(data: {
    userId?: string;
    name?: string;
    templateId?: string | null;
    hasPreview?: boolean;
  }): Promise<Project> {
    const user = await this.storage.getOrCreateUser(data.userId);
    const { data: projects } = await this.storage.getProjects(user.id, {
      page: 1,
      pageSize: user.projectLimit + 1,
    });
    if (projects.length >= user.projectLimit) {
      throw new ProjectLimitExceededException(user.projectLimit);
    }
    const project = await this.storage.createProject({
      userId: user.id,
      name: data.name ?? '新项目',
      templateId: data.templateId ?? null,
      hasPreview: data.hasPreview ?? false,
    });
    this.previewService.setupPreview(project.id);
    const welcomeMessage: ChatMessage = {
      id: createId(),
      projectId: project.id,
      conversationId: project.id,
      role: 'user',
      messageType: 'text',
      content: { kind: 'text', format: 'text', text: data.name ?? '新项目' },
      status: 'sent',
      createdAt: nowMs(),
      updatedAt: nowMs(),
    };
    await this.storage.addMessage(project.id, welcomeMessage);
    return project;
  }

  async getProjects(params: { userId?: string; page?: number; pageSize?: number }): Promise<{
    data: Project[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const user = await this.storage.getOrCreateUser(params.userId);
    const { data, meta } = await this.storage.getProjects(user.id, {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    });
    return {
      data,
      total: meta.total,
      page: meta.page,
      pageSize: meta.pageSize,
      totalPages: meta.totalPages,
    };
  }

  async getProject(id: string): Promise<Project> {
    let project = await this.storage.getProject(id);
    if (!project) throw new ProjectNotFoundException(id);

    if (project.sandboxId) {
      const { sandboxId, previewUrl } = await this.sandboxService.ensureSandbox(
        id,
        project.sandboxId
      );
      const updated = await this.storage.updateProject(id, { sandboxId, previewUrl });

      project = updated ?? { ...project, sandboxId, previewUrl };
    }

    return project;
  }

  async updateProject(
    id: string,
    data: {
      name?: string;
      hasPreview?: boolean;
      previewPort?: number;
      previewUrl?: string;
      previewStatus?: PreviewStatus;
      sandboxId?: string;
    }
  ): Promise<Project> {
    const project = await this.storage.updateProject(id, data);
    if (!project) throw new ProjectNotFoundException(id);
    return project;
  }

  async deleteProject(id: string): Promise<{ success: boolean }> {
    await this.previewService.stopPreview(id);
    const ok = await this.storage.deleteProject(id);
    if (!ok) throw new ProjectNotFoundException(id);
    return { success: true };
  }

  async getMessages(
    projectId: string,
    params: { page?: number; pageSize?: number }
  ): Promise<{
    data: ChatMessage[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    await this.getProject(projectId);
    const { data, meta } = await this.storage.getMessages(projectId, {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 50,
    });
    return {
      data,
      total: meta.total,
      page: meta.page,
      pageSize: meta.pageSize,
      totalPages: meta.totalPages,
    };
  }

  async getMessage(projectId: string, messageId: string): Promise<ChatMessage> {
    await this.getProject(projectId);
    const msg = await this.storage.getMessage(projectId, messageId);
    if (!msg) throw new MessageNotFoundException(projectId, messageId);
    return msg;
  }

  async updateMessage(projectId: string, messageId: string, content: string): Promise<ChatMessage> {
    const msg = await this.storage.updateMessage(projectId, messageId, content);
    if (!msg) throw new MessageNotFoundException(projectId, messageId);
    return msg;
  }

  async deleteMessage(projectId: string, messageId: string): Promise<{ success: boolean }> {
    const ok = await this.storage.deleteMessage(projectId, messageId);
    if (!ok) throw new MessageNotFoundException(projectId, messageId);
    return { success: true };
  }

  async sendMessage(
    params: SendMessageParams
  ): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
    const { projectId, content, selectedElements } = params;
    const project = await this.getProject(projectId);

    const now = nowMs();
    const userMessage: ChatMessage = {
      id: createId(),
      projectId,
      conversationId: project.id,
      role: 'user',
      messageType: 'text',
      content: { kind: 'text', format: 'text', text: content },
      status: 'sent',
      createdAt: now,
      updatedAt: now,
    };
    await this.storage.addMessage(projectId, userMessage);

    let assistantContent = '';
    const toolCalls: ToolCallRecord[] = [];
    const toolCallsById = new Map<string, number>();

    for await (const event of this.llmService.streamChat({
      content,
      selectedElements,
      workspaceRoot: projectId,
    })) {
      if (event.type === 'text') {
        assistantContent += event.text;
        continue;
      }
      if (event.type === 'tool-call') {
        const idx = toolCallsById.get(event.toolCallId) ?? toolCalls.length;
        if (!toolCallsById.has(event.toolCallId)) {
          toolCallsById.set(event.toolCallId, idx);
          toolCalls.push({
            id: event.toolCallId,
            name: event.toolName,
            arguments: event.input as Record<string, unknown>,
            success: false,
          });
        }
        continue;
      }
      if (event.type === 'tool-result') {
        const idx = toolCallsById.get(event.toolCallId);
        if (idx !== undefined) {
          const output = event.output as { isError?: boolean; result?: string };
          toolCalls[idx].success = !output?.isError;
          toolCalls[idx].resultSummary =
            typeof output?.result === 'string' ? output.result : JSON.stringify(event.output);
        }
        continue;
      }
      if (event.type === 'error') {
        const message =
          event.error instanceof Error
            ? event.error.message
            : ((event.error as { message?: string })?.message ?? '大模型调用失败');
        throw new ServiceUnavailableException(message);
      }
    }

    const assistantMessage: ChatMessage = {
      id: createId(),
      projectId,
      conversationId: project.id,
      role: 'assistant',
      messageType: 'markdown',
      content: {
        kind: 'text',
        format: 'markdown',
        text: assistantContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      },
      versionId: null,
      status: 'sent',
      createdAt: nowMs(),
      updatedAt: nowMs(),
    };
    await this.storage.addMessage(projectId, assistantMessage);

    return { userMessage, assistantMessage };
  }

  async sendMessageStream(res: Response, params: SendMessageParams): Promise<void> {
    const { projectId, content, selectedElements } = params;
    const project = await this.getProject(projectId);

    const now = nowMs();
    const userMessage: ChatMessage = {
      id: createId(),
      projectId,
      conversationId: project.id,
      role: 'user',
      messageType: 'text',
      content: { kind: 'text', format: 'text', text: content },
      status: 'sent',
      createdAt: now,
      updatedAt: now,
    };
    await this.storage.addMessage(projectId, userMessage);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const sendPart = (part: object) => {
      res.write(`data: ${JSON.stringify(part)}\n`);
      res.write('\n');
    };

    let fullContent = '';
    const toolCalls: ToolCallRecord[] = [];
    const toolCallsById = new Map<string, number>();

    for await (const event of this.llmService.streamChat({
      content,
      workspaceRoot: projectId,
      selectedElements,
    })) {
      if (event.type === 'text') {
        fullContent += event.text;
      }
      if (event.type === 'tool-call') {
        const idx = toolCallsById.get(event.toolCallId) ?? toolCalls.length;
        if (!toolCallsById.has(event.toolCallId)) {
          toolCallsById.set(event.toolCallId, idx);
          toolCalls.push({
            id: event.toolCallId,
            name: event.toolName,
            arguments: event.input as Record<string, unknown>,
            success: false,
          });
        }
      }
      if (event.type === 'tool-result') {
        const idx = toolCallsById.get(event.toolCallId);
        if (idx !== undefined) {
          const output = event.output as { isError?: boolean; result?: string };
          toolCalls[idx].success = !output?.isError;
          toolCalls[idx].resultSummary =
            typeof output?.result === 'string' ? output.result : JSON.stringify(event.output);
        }
      }
      sendPart(event);
    }

    const assistantMessage: ChatMessage = {
      id: createId(),
      projectId,
      conversationId: project.id,
      role: 'assistant',
      messageType: 'markdown',
      content: {
        kind: 'text',
        format: 'markdown',
        text: fullContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      },
      versionId: null,
      status: 'sent',
      createdAt: nowMs(),
      updatedAt: nowMs(),
    };
    await this.storage.addMessage(projectId, assistantMessage);

    res.end();
  }
}
