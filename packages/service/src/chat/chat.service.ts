/**
 * @file: chat.service.ts
 * @author houfujian houfujian@jd.com
 * @description 会话与消息业务逻辑，委托存储层 CRUD
 */

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import type {
  IChatStorage,
  Conversation,
  Message,
  PreviewStatus,
} from './storage/chat-storage.interface';
import { LlmService } from '../llm/llm.service';
import { PreviewService } from '../preview/preview.service';

function createId(): string {
  return Math.random().toString(36).slice(2, 11);
}

@Injectable()
export class ChatService {
  constructor(
    @Inject('IChatStorage') private readonly storage: IChatStorage,
    private readonly llmService: LlmService,
    private readonly previewService: PreviewService
  ) {}

  async createConversation(data: { title?: string; hasPreview?: boolean }): Promise<Conversation> {
    const conversation = await this.storage.createConversation(data);
    this.previewService.setupPreview(conversation.id);

    const now = new Date().toISOString();
    const welcomeMessage: Message = {
      id: createId(),
      role: 'user',
      content: data.title ?? '新会话',
      contentFormat: 'text',
      createdAt: now,
      updatedAt: now,
    };
    await this.storage.addMessage(conversation.id, welcomeMessage);

    return conversation;
  }

  async getConversations(params: {
    page?: number;
    pageSize?: number;
  }): Promise<{ data: Conversation[]; meta: unknown }> {
    return this.storage.getConversations({
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    });
  }

  async getConversation(id: string): Promise<Conversation> {
    const conv = await this.storage.getConversation(id);
    if (!conv) throw new NotFoundException('会话不存在');
    return conv;
  }

  async updateConversation(
    id: string,
    data: {
      title?: string;
      hasPreview?: boolean;
      previewPort?: number;
      previewUrl?: string;
      previewStatus?: PreviewStatus;
    }
  ): Promise<Conversation> {
    const conv = await this.storage.updateConversation(id, data);
    if (!conv) throw new NotFoundException('会话不存在');
    return conv;
  }

  async deleteConversation(id: string): Promise<{ success: boolean }> {
    await this.previewService.stopPreview(id);
    const ok = await this.storage.deleteConversation(id);
    if (!ok) throw new NotFoundException('会话不存在');
    return { success: true };
  }

  async getMessages(
    conversationId: string,
    params: { page?: number; pageSize?: number }
  ): Promise<{ data: Message[]; meta: unknown }> {
    await this.getConversation(conversationId);
    return this.storage.getMessages(conversationId, {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 50,
    });
  }

  async getMessage(conversationId: string, messageId: string): Promise<Message> {
    await this.getConversation(conversationId);
    const msg = await this.storage.getMessage(conversationId, messageId);
    if (!msg) throw new NotFoundException('消息不存在');
    return msg;
  }

  async updateMessage(
    conversationId: string,
    messageId: string,
    content: string
  ): Promise<Message> {
    const msg = await this.storage.updateMessage(conversationId, messageId, content);
    if (!msg) throw new NotFoundException('消息不存在');
    await this.storage.updateConversation(conversationId, {});
    return msg;
  }

  async deleteMessage(conversationId: string, messageId: string): Promise<{ success: boolean }> {
    const ok = await this.storage.deleteMessage(conversationId, messageId);
    if (!ok) throw new NotFoundException('消息不存在');
    return { success: true };
  }

  async sendMessage(params: {
    conversationId: string;
    content: string;
    selectedElements?: Array<{
      id: string;
      name: string;
      type: string;
      filePath: string;
      fileName: string;
      lineNumber: number;
      col: number;
      floorId?: string;
      rect: {
        left: number;
        top: number;
        width: number;
        height: number;
        right: number;
        bottom: number;
      };
    }>;
  }): Promise<{ userMessage: Message; assistantMessage: Message }> {
    const { conversationId, content, selectedElements } = params;
    const conv = await this.getConversation(conversationId);
    const { data: history } = await this.storage.getMessages(conversationId, {
      page: 1,
      pageSize: 50,
    });

    const now = new Date().toISOString();
    const userMessage: Message = {
      id: createId(),
      role: 'user',
      content,
      contentFormat: 'text',
      createdAt: now,
      updatedAt: now,
    };
    await this.storage.addMessage(conversationId, userMessage);

    const workspaceRoot = conv.previewUrl
      ? this.previewService.getPreviewDir(conversationId)
      : undefined;
    let assistantContent = '';
    for await (const event of this.llmService.streamChat({
      content,
      history,
      workspaceRoot,
      selectedElements,
    })) {
      if (event.type === 'content') assistantContent += event.chunk;
    }

    const assistantMessage: Message = {
      id: createId(),
      role: 'assistant',
      content: assistantContent,
      contentFormat: 'markdown',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      model: process.env.LLM_MODEL,
    };
    await this.storage.addMessage(conversationId, assistantMessage);
    await this.storage.updateConversation(conversationId, {});

    return { userMessage, assistantMessage };
  }

  async sendMessageStream(
    res: Response,
    params: {
      conversationId: string;
      content: string;
      selectedElements?: Array<{
        id: string;
        name: string;
        type: string;
        filePath: string;
        fileName: string;
        lineNumber: number;
        col: number;
        floorId?: string;
        rect: {
          left: number;
          top: number;
          width: number;
          height: number;
          right: number;
          bottom: number;
        };
      }>;
    }
  ): Promise<void> {
    const { conversationId, content, selectedElements } = params;
    const conv = await this.getConversation(conversationId);
    const { data: history } = await this.storage.getMessages(conversationId, {
      page: 1,
      pageSize: 50,
    });

    const now = new Date().toISOString();
    const userMessage: Message = {
      id: createId(),
      role: 'user',
      content,
      contentFormat: 'text',
      createdAt: now,
      updatedAt: now,
    };
    await this.storage.addMessage(conversationId, userMessage);

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

    sendEvent('user_message', userMessage);

    const workspaceRoot = conv.previewUrl
      ? this.previewService.getPreviewDir(conversationId)
      : undefined;
    let fullContent = '';
    try {
      for await (const event of this.llmService.streamChat({
        content,
        history,
        workspaceRoot,
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
          case 'tool_call_start':
            sendEvent('tool_call_start', {
              id: event.id,
              name: event.name,
              arguments: event.arguments,
            });
            break;
          case 'tool_call_end':
            sendEvent('tool_call_end', {
              id: event.id,
              name: event.name,
              success: event.success,
              resultSummary: event.resultSummary,
            });
            break;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '大模型调用失败';
      sendEvent('error', { message });
      res.end();
      return;
    }

    const assistantMessage: Message = {
      id: createId(),
      role: 'assistant',
      content: fullContent,
      contentFormat: 'markdown',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      model: process.env.LLM_MODEL,
    };
    await this.storage.addMessage(conversationId, assistantMessage);
    await this.storage.updateConversation(conversationId, {});

    sendEvent('assistant_message', assistantMessage);
    res.end();
  }
}
