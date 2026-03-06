/**
 * @file: chat.ts
 * @description 对话、消息、技能等类型定义
 */

export type SkillId = 'quick' | 'coding' | 'research' | 'image' | 'write' | 'video' | 'more';

export interface SkillItem {
  id: SkillId;
  label: string;
  icon?: string;
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  hasPreview: boolean;
  unread?: number;
  /** 预览端口，本期为 localhost */
  previewPort?: number;
  /** 预览地址，本期为 http://localhost:${previewPort} */
  previewUrl?: string;
  /** 预览状态：pending 启动中，running 已就绪，failed 启动失败 */
  previewStatus?: 'pending' | 'running' | 'failed';
}

export type MessageRole = 'user' | 'assistant';

/** 消息内容格式：前端按 contentFormat 渲染（如 markdown 代码块、加粗等） */
export type MessageContentFormat = 'text' | 'markdown';

/** 发送/流式状态，仅前端使用，不持久化、不通过 API 同步 */
export type MessageStatus = 'sending' | 'sent' | 'streaming' | 'failed';

/** 预览中选中的元素，与 Inspector 上报结构一致，发送消息时带给接口 */
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
  /** 助手消息由哪款模型生成，可选，预留多模型 */
  model?: string;
  /** 扩展信息：token 用量、finish_reason 等，按需定义 */
  metadata?: Record<string, unknown>;
}

/** 流式阶段：思考 / 工具调用中 / 输出内容 / 结束 */
export type StreamPhase = 'thinking' | 'tool_calls' | 'content' | 'done';

/** 单次工具调用状态（流式展示用） */
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
