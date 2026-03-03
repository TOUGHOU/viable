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
}

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
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
