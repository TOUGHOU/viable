/**
 * @file: messageContent.type.ts
 * @author houfujian houfujian@jd.com
 * @description assistant 消息 contentJson 结构：工具调用过程与结果
 */

/** 单次工具调用记录（过程 + 结果） */
export interface ToolCallRecord {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  success: boolean;
  resultSummary?: string;
}

/** assistant 消息 contentJson 根结构 */
export interface AssistantMessageContentJson {
  toolCalls?: ToolCallRecord[];
}
