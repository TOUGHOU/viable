/**
 * @file: chat.service.ts
 * @author houfujian houfujian@jd.com
 * @description 项目与消息业务逻辑，委托存储层 CRUD；一次对话即一个项目，assistant 消息不一定产生版本
 */

import { Inject, Injectable } from '@nestjs/common';
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
import type { AssistantMessageContentJson, ToolCallRecord } from './messageContent.type';
import type { StreamChatEvent } from '../llm/llm.service';
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
      contentText: data.name ?? '新项目',
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

  /**
   * 有预览时返回预览目录作为工作区根路径，供 LLM 读写文件；无预览返回 undefined
   */
  private getE2BWorkspaceRoot(project: Project): string | undefined {
    if (!project.sandboxId) return undefined;
    return `e2b://${project.sandboxId}`;
  }

  /**
   * 消费 streamChat 流，收集文本内容与工具调用记录
   * @returns { content, toolCalls }
   */
  private async runStreamAndCollect(
    stream: AsyncGenerator<StreamChatEvent>
  ): Promise<{ content: string; toolCalls: ToolCallRecord[] }> {
    let content = '';
    const toolCalls: ToolCallRecord[] = [];
    const byId = new Map<string, number>();

    for await (const event of stream) {
      if (event.type === 'content') {
        content += event.chunk;
        continue;
      }
      if (event.type === 'tool_call_start') {
        const idx = toolCalls.length;
        byId.set(event.id, idx);
        toolCalls.push({
          id: event.id,
          name: event.name,
          arguments: event.arguments,
          success: false,
        });
        continue;
      }
      if (event.type === 'tool_call_end') {
        const idx = byId.get(event.id);
        if (idx !== undefined) {
          toolCalls[idx].success = event.success;
          toolCalls[idx].resultSummary = event.resultSummary;
        }
      }
    }
    return { content, toolCalls };
  }

  async sendMessage(
    params: SendMessageParams
  ): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
    const { projectId, content, selectedElements } = params;
    const project = await this.getProject(projectId);
    const { data: history } = await this.storage.getMessages(projectId, {
      page: 1,
      pageSize: 50,
    });

    const now = nowMs();
    const userMessage: ChatMessage = {
      id: createId(),
      projectId,
      conversationId: project.id,
      role: 'user',
      messageType: 'text',
      contentText: content,
      status: 'sent',
      createdAt: now,
      updatedAt: now,
    };
    await this.storage.addMessage(projectId, userMessage);

    const { content: assistantContent, toolCalls } = await this.runStreamAndCollect(
      this.llmService.streamChat({
        content,
        selectedElements,
        workspaceRoot: this.getE2BWorkspaceRoot(project),
      })
    );

    const assistantMessage: ChatMessage = {
      id: createId(),
      projectId,
      conversationId: project.id,
      role: 'assistant',
      messageType: 'markdown',
      contentText: assistantContent,
      contentJson:
        toolCalls.length > 0
          ? JSON.stringify({ toolCalls } satisfies AssistantMessageContentJson)
          : null,
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
    const { data: history } = await this.storage.getMessages(projectId, {
      page: 1,
      pageSize: 50,
    });

    const now = nowMs();
    const userMessage: ChatMessage = {
      id: createId(),
      projectId,
      conversationId: project.id,
      role: 'user',
      messageType: 'text',
      contentText: content,
      status: 'sent',
      createdAt: now,
      updatedAt: now,
    };
    await this.storage.addMessage(projectId, userMessage);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvent = (event: string, data: string | object) => {
      res.write(`event: ${event}\n`);
      if (typeof data === 'string') {
        for (const line of data.split('\n')) res.write(`data: ${line}\n`);
      } else {
        res.write(`data: ${JSON.stringify(data)}\n`);
      }
      res.write('\n');
    };

    const toMessagePayload = (m: ChatMessage) => ({
      id: m.id,
      role: m.role,
      content: m.contentText ?? '',
      contentFormat: m.messageType === 'markdown' ? 'markdown' : 'text',
      createdAt: new Date(m.createdAt).toISOString(),
      updatedAt: new Date(m.updatedAt).toISOString(),
      versionId: m.versionId ?? undefined,
    });
    sendEvent('user_message', toMessagePayload(userMessage));

    let fullContent = '';
    const toolCalls: ToolCallRecord[] = [];
    const toolCallsById = new Map<string, number>();
    try {
      for await (const event of this.llmService.streamChat({
        content,
        workspaceRoot: projectId,
        selectedElements,
      })) {
        switch (event.type) {
          case 'content':
            fullContent += event.chunk;
            sendEvent('content', event.chunk);
            break;
          case 'status':
            sendEvent('status', { phase: event.phase });
            break;
          case 'tool_call_start': {
            const startIdx = toolCalls.length;
            toolCallsById.set(event.id, startIdx);
            toolCalls.push({
              id: event.id,
              name: event.name,
              arguments: event.arguments,
              success: false,
            });
            sendEvent('tool_call_start', {
              id: event.id,
              name: event.name,
              arguments: event.arguments,
            });
            break;
          }
          case 'tool_call_end': {
            const endIdx = toolCallsById.get(event.id);
            if (endIdx !== undefined) {
              toolCalls[endIdx].success = event.success;
              toolCalls[endIdx].resultSummary = event.resultSummary;
            }
            sendEvent('tool_call_end', {
              id: event.id,
              name: event.name,
              success: event.success,
              resultSummary: event.resultSummary,
            });
            break;
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '大模型调用失败';
      sendEvent('error', { message });
      res.end();
      return;
    }

    const assistantMessage: ChatMessage = {
      id: createId(),
      projectId,
      conversationId: project.id,
      role: 'assistant',
      messageType: 'markdown',
      contentText: fullContent,
      contentJson:
        toolCalls.length > 0
          ? JSON.stringify({ toolCalls } satisfies AssistantMessageContentJson)
          : null,
      versionId: null,
      status: 'sent',
      createdAt: nowMs(),
      updatedAt: nowMs(),
    };
    await this.storage.addMessage(projectId, assistantMessage);

    const assistantPayload = toMessagePayload(assistantMessage);
    sendEvent('assistant_message', {
      ...assistantPayload,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    });
    res.end();
  }
}
