/**
 * @file chatApi.ts
 * @author houfujian houfujian@jd.com
 * @description 项目与对话相关 API，统一 POST；一次对话即一个项目
 */

import type { Project, Message, SelectedElement, StreamPhase } from '@/types/chat';

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

function toProject(p: Record<string, unknown>): Project {
  const createdAt = p.createdAt as number | string;
  const updatedAt = p.updatedAt as number | string;
  return {
    ...p,
    name: (p.name as string) ?? (p.title as string) ?? '新项目',
    createdAt: typeof createdAt === 'number' ? new Date(createdAt).toISOString() : createdAt,
    updatedAt: typeof updatedAt === 'number' ? new Date(updatedAt).toISOString() : updatedAt,
  } as Project;
}

function toMessage(m: Record<string, unknown>): Message {
  const createdAt = m.createdAt as number | string;
  const updatedAt = m.updatedAt as number | string;
  return {
    id: m.id as string,
    role: m.role as Message['role'],
    content: (m.content as string) ?? (m.contentText as string) ?? '',
    contentFormat: ((m.contentFormat as string) ?? ((m.messageType as string) === 'markdown' ? 'markdown' : 'text')) as Message['contentFormat'],
    createdAt: typeof createdAt === 'number' ? new Date(createdAt).toISOString() : String(createdAt),
    updatedAt: typeof updatedAt === 'number' ? new Date(updatedAt).toISOString() : String(updatedAt),
    model: m.model as string | undefined,
    metadata: m.metadata as Record<string, unknown> | undefined,
    versionId: m.versionId as string | null | undefined,
  };
}

export async function createProject(body: {
  title?: string;
  name?: string;
  templateId?: string;
  userId?: string;
  hasPreview?: boolean;
} = {}): Promise<Project> {
  const res = await request<Record<string, unknown>>('/chat/createProject', body);
  return toProject(res as Record<string, unknown>);
}

export interface GetProjectsResult {
  data: Project[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

export async function getProjects(body: {
  userId?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<GetProjectsResult> {
  const res = await request<{ data: Record<string, unknown>[]; meta: GetProjectsResult['meta'] }>(
    '/chat/getProjects',
    body
  );
  return {
    data: (res.data ?? []).map((p) => toProject(p)),
    meta: res.meta!,
  };
}

export async function getProject(body: { id: string }): Promise<Project> {
  const res = await request<Record<string, unknown>>('/chat/getProject', body);
  return toProject(res as Record<string, unknown>);
}

export interface GetMessagesResult {
  data: Message[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

export async function getMessages(body: {
  projectId: string;
  page?: number;
  pageSize?: number;
}): Promise<GetMessagesResult> {
  const res = await request<{ data: Record<string, unknown>[]; meta: GetMessagesResult['meta'] }>(
    '/chat/getMessages',
    body
  );
  return {
    data: (res.data ?? []).map(toMessage),
    meta: res.meta!,
  };
}

export async function updateProject(body: {
  id: string;
  name?: string;
  title?: string;
  hasPreview?: boolean;
  previewPort?: number;
  previewUrl?: string;
  previewStatus?: 'pending' | 'running' | 'failed';
}): Promise<Project> {
  const res = await request<Record<string, unknown>>('/chat/updateProject', body);
  return toProject(res as Record<string, unknown>);
}

export async function deleteProject(body: { id: string }): Promise<{ success?: boolean }> {
  return request('/chat/deleteProject', body);
}

export async function getMessage(body: {
  projectId: string;
  messageId: string;
}): Promise<Message> {
  const res = await request<Record<string, unknown>>('/chat/getMessage', body);
  return toMessage(res as Record<string, unknown>);
}

export async function updateMessage(body: {
  projectId: string;
  messageId: string;
  content: string;
}): Promise<Message> {
  const res = await request<Record<string, unknown>>('/chat/updateMessage', body);
  return toMessage(res as Record<string, unknown>);
}

export async function deleteMessage(body: {
  projectId: string;
  messageId: string;
}): Promise<{ success?: boolean }> {
  return request('/chat/deleteMessage', body);
}

export interface SendMessageResult {
  userMessage: Message;
  assistantMessage: Message;
}

export async function sendMessage(body: {
  projectId: string;
  content: string;
  selectedElements?: SelectedElement[];
}): Promise<SendMessageResult> {
  const res = await request<{
    userMessage: Record<string, unknown>;
    assistantMessage: Record<string, unknown>;
  }>('/chat/sendMessage', body);
  return {
    userMessage: toMessage(res.userMessage),
    assistantMessage: toMessage(res.assistantMessage),
  };
}

export async function sendMessageStream(
  body: { projectId: string; content: string; selectedElements?: SelectedElement[] },
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
        callbacks.onUserMessage(toMessage(JSON.parse(data) as Record<string, unknown>));
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
        callbacks.onAssistantMessage(toMessage(JSON.parse(data) as Record<string, unknown>));
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
