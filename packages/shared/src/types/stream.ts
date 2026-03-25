/**
 * @file stream.ts
 * @author houfujian(houfujian@jd.com)
 * @description Shared SSE TextStreamPart types aligned with message.md.
 */

import type { FinishReason } from './message';

export interface Warning {
  type: string;
  message: string;
}

export interface StepUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
}

export type TotalUsage = StepUsage;

export interface ResponseMetadata {
  id: string;
  modelId: string;
  timestamp: string;
  headers?: Record<string, string>;
}

export type TextStreamPart =
  | { type: 'start' }
  | { type: 'start-step'; request: { body: string }; warnings: Warning[] }
  | { type: 'finish-step'; response: ResponseMetadata; usage: StepUsage; finishReason: FinishReason; isContinued: boolean }
  | { type: 'finish'; finishReason: FinishReason; totalUsage: TotalUsage }
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string }
  | { type: 'reasoning-part-finish' }
  | { type: 'tool-call-streaming-start'; toolCallId: string; toolName: string }
  | { type: 'tool-call-delta'; toolCallId: string; toolName: string; argsTextDelta: string }
  | { type: 'tool-call'; toolCallId: string; toolName: string; input: object }
  | { type: 'tool-result'; toolCallId: string; toolName: string; input: object; output: unknown }
  | { type: 'source'; sourceType: 'url'; id: string; url: string; title?: string }
  | { type: 'error'; error: unknown }
  | { type: 'abort'; reason?: unknown };
