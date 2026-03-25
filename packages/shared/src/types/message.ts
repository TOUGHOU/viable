/**
 * @file message.ts
 * @author houfujian(houfujian@jd.com)
 * @description Shared message types aligned with message.md.
 */

export interface TextPart {
  type: 'text';
  text: string;
}

export interface ImagePart {
  type: 'image';
  image: string | URL | Uint8Array;
  mediaType?: string;
}

export interface FilePart {
  type: 'file';
  data: string | URL | Uint8Array;
  mediaType: string;
}

export interface ReasoningPart {
  type: 'reasoning';
  text: string;
  signature?: string;
}

export interface ToolCallPart {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  input: object;
}

export interface ToolResultPart {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  result: unknown;
  isError?: boolean;
}

export type VersionStatus = 'pending' | 'applied' | 'reverted';

export interface FileChange {
  path: string;
  type: 'create' | 'modify' | 'delete';
  language?: string;
  before?: string;
  after?: string;
}

export interface VersionPart {
  type: 'version';
  versionId: string;
  title: string;
  description?: string;
  changes: FileChange[];
  status: VersionStatus;
  createdAt: string;
  parentVersionId?: string;
}

export interface SystemModelMessage {
  role: 'system';
  content: string;
}

export interface UserModelMessage {
  role: 'user';
  content: string | Array<TextPart | ImagePart | FilePart>;
}

export interface AssistantModelMessage {
  role: 'assistant';
  content: string | Array<TextPart | ReasoningPart | ToolCallPart | FilePart | VersionPart>;
}

export interface ToolModelMessage {
  role: 'tool';
  content: ToolResultPart[];
}

export type ModelMessage =
  | SystemModelMessage
  | UserModelMessage
  | AssistantModelMessage
  | ToolModelMessage;

export type FinishReason = 'stop' | 'length' | 'content-filter' | 'tool-calls' | 'error' | 'other';

export type ToolInvocationState = 'partial-call' | 'call' | 'result';

export interface ToolInvocation {
  state: ToolInvocationState;
  toolCallId: string;
  toolName: string;
  input: object;
  output?: unknown;
}

export interface SourcePart {
  sourceType: 'url';
  id: string;
  url: string;
  title?: string;
}

export interface GeneratedFile {
  base64: string;
  mediaType: string;
}

export type UIMessagePart =
  | { type: 'step-start' }
  | { type: 'text'; text: string }
  | { type: 'reasoning'; reasoning: string }
  | { type: 'tool-invocation'; toolInvocation: ToolInvocation }
  | { type: 'source'; source: SourcePart }
  | { type: 'file'; file: GeneratedFile };

export interface UIMessageMetadata {
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  model?: string;
  finishReason?: FinishReason;
  [key: string]: unknown;
}

export interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: UIMessagePart[];
  metadata?: UIMessageMetadata;
}

export type ChatMessageRole = ModelMessage['role'];

export type ChatMessageType = 'text' | 'markdown' | 'parts';

export type ChatMessageStatus = 'sending' | 'sent' | 'streaming' | 'failed';

export interface ChatMessageBase {
  id: string;
  projectId: string;
  conversationId: string;
  parentId?: string | null;
  role: ChatMessageRole;
  metadata?: string | null;
  versionId?: string | null;
  status: ChatMessageStatus;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessageToolCall {
  id: string;
  name: string;
  arguments?: Record<string, unknown>;
  success: boolean;
  resultSummary?: string;
}

export interface TextMessageContent {
  kind: 'text';
  format: 'text' | 'markdown';
  text: string;
  toolCalls?: ChatMessageToolCall[];
}

export interface PartsMessageContent {
  kind: 'parts';
  parts: Array<TextPart | ImagePart | FilePart | ReasoningPart | ToolCallPart | ToolResultPart | VersionPart>;
}

export type ChatMessageContent = TextMessageContent | PartsMessageContent;

export interface TextChatMessage extends ChatMessageBase {
  messageType: 'text' | 'markdown';
  content: TextMessageContent;
}

export interface PartsChatMessage extends ChatMessageBase {
  messageType: 'parts';
  content: PartsMessageContent;
}

export type ChatMessage = TextChatMessage | PartsChatMessage;
