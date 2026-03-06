/**
 * @file chatApi.ts
 * @author houfujian houfujian@jd.com
 * @description 对话相关 API，统一 POST，baseURL 由环境变量或默认值
 */

import type { Conversation, Message, SelectedElement, StreamPhase } from '@/types/chat';

const BASE_URL =
  (typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env
      ?.VITE_API_BASE_URL) ||
  'http://localhost:3000';

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

async function request<T>(
  path: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let err: ApiError;
    try {
      err = (await res.json()) as ApiError;
    } catch {
      err = {
        statusCode: res.status,
        message: res.statusText || '请求失败',
      };
    }
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return res.json() as Promise<T>;
  }
  return undefined as unknown as T;
}

export async function createConversation(body: {
  title?: string;
  hasPreview?: boolean;
} = {}): Promise<Conversation> {
  return request<Conversation>('/chat/createConversation', body);
}

export interface GetConversationsResult {
  data: Conversation[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

export async function getConversations(body: {
  page?: number;
  pageSize?: number;
} = {}): Promise<GetConversationsResult> {
  return request<GetConversationsResult>('/chat/getConversations', body);
}

export async function getConversation(body: { id: string }): Promise<Conversation> {
  return request<Conversation>('/chat/getConversation', body);
}

export interface GetMessagesResult {
  data: Message[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

export async function getMessages(body: {
  conversationId: string;
  page?: number;
  pageSize?: number;
}): Promise<GetMessagesResult> {
  return request<GetMessagesResult>('/chat/getMessages', body);
}

export async function updateConversation(body: {
  id: string;
  title?: string;
  hasPreview?: boolean;
  previewPort?: number;
  previewUrl?: string;
  previewStatus?: 'pending' | 'running' | 'failed';
}): Promise<Conversation> {
  return request<Conversation>('/chat/updateConversation', body);
}

export async function deleteConversation(body: {
  id: string;
}): Promise<{ success?: boolean }> {
  return request('/chat/deleteConversation', body);
}

export async function getMessage(body: {
  conversationId: string;
  messageId: string;
}): Promise<Message> {
  return request<Message>('/chat/getMessage', body);
}

export async function updateMessage(body: {
  conversationId: string;
  messageId: string;
  content: string;
}): Promise<Message> {
  return request<Message>('/chat/updateMessage', body);
}

export async function deleteMessage(body: {
  conversationId: string;
  messageId: string;
}): Promise<{ success?: boolean }> {
  return request('/chat/deleteMessage', body);
}

export interface SendMessageResult {
  userMessage: Message;
  assistantMessage: Message;
}

export async function sendMessage(body: {
  conversationId: string;
  content: string;
  selectedElements?: SelectedElement[];
}): Promise<SendMessageResult> {
  return request<SendMessageResult>('/chat/sendMessage', body);
}

export async function sendMessageStream(
  body: { conversationId: string; content: string; selectedElements?: SelectedElement[] },
  callbacks: {
    onUserMessage?: (message: Message) => void;
    onContent?: (chunk: string) => void;
    onStatus?: (phase: StreamPhase) => void;
    onToolCallStart?: (payload: { id: string; name: string; arguments: Record<string, unknown> }) => void;
    onToolCallEnd?: (payload: { id: string; name: string; success: boolean; resultSummary?: string }) => void;
    onAssistantMessage?: (message: Message) => void;
    onError?: (message: string) => void;
  }
): Promise<void> {
  const res = await fetch(`${BASE_URL}/chat/sendMessageStream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let err: ApiError;
    try {
      err = (await res.json()) as ApiError;
    } catch {
      err = { statusCode: res.status, message: res.statusText || '请求失败' };
    }
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error('无响应体');
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = '';
  let currentData: string[] = [];

  const flushEvent = () => {
    if (!currentEvent) return;
    const data = currentData.join('\n').trim();
    if (!data) {
      currentEvent = '';
      currentData = [];
      return;
    }
    try {
      if (currentEvent === 'user_message' && callbacks.onUserMessage) {
        callbacks.onUserMessage(JSON.parse(data) as Message);
      } else if (currentEvent === 'content' && callbacks.onContent) {
        try {
          const parsed = JSON.parse(data) as string;
          callbacks.onContent(parsed);
        } catch {
          callbacks.onContent(data);
        }
      } else if (currentEvent === 'status' && callbacks.onStatus) {
        const obj = JSON.parse(data) as { phase: StreamPhase };
        callbacks.onStatus(obj.phase);
      } else if (currentEvent === 'tool_call_start' && callbacks.onToolCallStart) {
        const obj = JSON.parse(data) as { id: string; name: string; arguments: Record<string, unknown> };
        callbacks.onToolCallStart(obj);
      } else if (currentEvent === 'tool_call_end' && callbacks.onToolCallEnd) {
        const obj = JSON.parse(data) as { id: string; name: string; success: boolean; resultSummary?: string };
        callbacks.onToolCallEnd(obj);
      } else if (currentEvent === 'assistant_message' && callbacks.onAssistantMessage) {
        callbacks.onAssistantMessage(JSON.parse(data) as Message);
      } else if (currentEvent === 'error' && callbacks.onError) {
        const obj = JSON.parse(data) as { message?: string };
        callbacks.onError(obj.message || data);
      }
    } catch {
      if (currentEvent === 'content' && callbacks.onContent) {
        callbacks.onContent(data);
      }
    }
    currentEvent = '';
    currentData = [];
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        flushEvent();
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        currentData.push(line.slice(6));
      } else if (line === '') {
        flushEvent();
      }
    }
  }
  flushEvent();
}
