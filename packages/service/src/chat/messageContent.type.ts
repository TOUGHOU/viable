/**
 * @file: messageContent.type.ts
 * @author houfujian houfujian@jd.com
 * @description assistant 消息工具调用记录类型
 */

import type { ChatMessageToolCall } from '@vibe/shared';

/** 单次工具调用记录（过程 + 结果） */
export type ToolCallRecord = ChatMessageToolCall;
