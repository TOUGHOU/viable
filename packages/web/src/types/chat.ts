/**
 * @file: chat.ts
 * @description 项目、对话消息、技能等类型定义（一次对话即一个项目）
 */

export type SkillId = 'quick' | 'coding' | 'research' | 'image' | 'write' | 'video' | 'more';

export interface SkillItem {
  id: SkillId;
  label: string;
  icon?: string;
}

/** 项目：一次对话对应一个项目 */
export interface Project {
  id: string;
  userId?: string;
  name: string;
  description?: string | null;
  templateId?: string | null;
  framework?: string;
  styling?: string;
  currentVersionId?: string | null;
  createdAt: number | string;
  updatedAt: number | string;
  hasPreview: boolean;
  unread?: number;
  previewPort?: number;
  previewUrl?: string | null;
  previewStatus?: 'pending' | 'running' | 'failed';
}

/** 兼容旧字段：部分 API 仍返回 title，映射为 name */
export type ProjectLike = Project & { title?: string };

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageContentFormat = 'text' | 'markdown';

export type MessageStatus = 'sending' | 'sent' | 'streaming' | 'failed';

export interface SelectedElement {
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
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  contentFormat?: MessageContentFormat;
  createdAt: string;
  updatedAt: string;
  model?: string;
  metadata?: Record<string, unknown>;
  /** 仅 assistant 消息在产生代码变更时有值 */
  versionId?: string | null;
}

export type StreamPhase = 'thinking' | 'tool_calls' | 'content' | 'done';

export interface StreamToolCall {
  id: string;
  name: string;
  status: 'running' | 'done';
  arguments?: Record<string, unknown>;
  success?: boolean;
  resultSummary?: string;
}

export const SKILLS: SkillItem[] = [];

export const QUICK_QUESTIONS = [
  '资讯:伊朗打击巴林美军 巴林拦截61枚导弹',
  '一吨100元和100吨1元哪个更值钱?',
  '黄金现在多少钱一克?',
  '讲个笑话让我开心一下',
  '在家做什么可以增加收入来源?',
  '帮我设计一个5分钟就能玩的快速互动小游戏',
  'AI是什么',
];
