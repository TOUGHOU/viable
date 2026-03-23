/**
 * @file: messag.ts
 * @author: houfujian houfujian@jd.com
 */
// ─────────────────────────────────────────
// Content Parts — AI SDK standard
// ─────────────────────────────────────────

export interface TextPart {
  type: 'text';
  text: string;
}

export interface ImagePart {
  type: 'image';
  image: string | Uint8Array | Buffer | ArrayBuffer | URL;
  mediaType?: string;
}

export interface FilePart {
  type: 'file';
  data: string | Uint8Array | Buffer | ArrayBuffer | URL;
  mediaType: string;
  filename?: string;
}

export interface ReasoningPart {
  type: 'reasoning';
  text: string;
}

export interface ToolCallPart {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  input: Record<string, unknown>;
}

export interface ToolResultPart {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  result: unknown;
  isError?: boolean;
}

// ─────────────────────────────────────────
// Content Parts — UI extensions
// ─────────────────────────────────────────

export type VersionStatus =
  | 'pending' // 模型刚生成，等待用户确认
  | 'applied' // 用户已应用到项目
  | 'reverted'; // 用户已回滚

export interface FileChange {
  path: string; // 文件路径，如 'src/components/Button.tsx'
  type: 'create' | 'modify' | 'delete';
  language?: string; // 用于语法高亮，如 'typescript'、'css'
  before?: string; // 修改前内容（modify / delete 时有值）
  after?: string; // 修改后内容（create / modify 时有值）
}

export interface VersionPart {
  type: 'version';
  versionId: string; // 版本唯一 ID
  title: string; // 版本标题，如 '新增登录表单组件'
  description?: string; // 本次修改的简要说明
  changes: FileChange[]; // 涉及的文件变更列表
  status: VersionStatus;
  createdAt: string; // ISO 8601 时间戳
  parentVersionId?: string; // 上一个版本 ID，构建版本链
}

// ─────────────────────────────────────────
// Messages
// ─────────────────────────────────────────

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
  content: string | Array<TextPart | FilePart | ReasoningPart | ToolCallPart | VersionPart>;
}

export interface ToolModelMessage {
  role: 'tool';
  content: Array<ToolResultPart>;
}

export type ModelMessage =
  | SystemModelMessage
  | UserModelMessage
  | AssistantModelMessage
  | ToolModelMessage;
