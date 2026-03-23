/**
 * @file: llm.service.ts
 * @author houfujian houfujian@jd.com
 * @description 大模型调用封装，仅流式请求，支持 tool 调用与 coding agent 系统提示
 */

import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import OpenAI from 'openai';
/** 对话历史项，仅需 role 与 content 供 LLM 使用 */
interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}
import { ToolsService } from './tool/tools.service';
import { getAgentPrompt } from './prompt/agent-prompt';
import { TOOL_SCHEMA } from './tool/tool-schema';
import { SelectedElement } from 'src/type';
import { buildUserPrompt } from './util/build-user-prompt';

const AGENT_MAX_TURNS = 15;
const RECENT_MESSAGES_WINDOW = 20;

/** 流式 chunk 中用于累积的 tool call */
interface AccumulatedToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

/** 流式对话事件：供前端展示思考/工具调用状态与文本内容 */
export type StreamChatEvent =
  | { type: 'content'; chunk: string }
  | { type: 'status'; phase: 'thinking' | 'tool_calls' | 'content' | 'done' }
  | {
      type: 'tool_call_start';
      id: string;
      name: string;
      arguments: Record<string, unknown>;
    }
  | {
      type: 'tool_call_end';
      id: string;
      name: string;
      success: boolean;
      resultSummary?: string;
    };

const MAX_RESULT_SUMMARY_LEN = 200;

function toResultSummary(raw: string): string {
  const s = String(raw).trim();
  if (s.length <= MAX_RESULT_SUMMARY_LEN) return s;
  return s.slice(0, MAX_RESULT_SUMMARY_LEN) + '…';
}

@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);
  private codingAgentPrompt: string | null = null;
  private messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: getAgentPrompt(),
    },
  ];

  constructor(private readonly toolsService: ToolsService) {}

  /**
   * 预加载 coding agent 提示词，避免首条工作区消息时阻塞 I/O（perf: 静态资源模块级加载）
   */
  async onModuleInit(): Promise<void> {
    await this.loadCodingAgentPrompt();
  }

  /** 加载 coding agent 系统提示词（仅在工作区模式下使用），失败时返回 null 并打日志 */
  private async loadCodingAgentPrompt(): Promise<string | null> {
    if (this.codingAgentPrompt !== null) return this.codingAgentPrompt;

    this.codingAgentPrompt = getAgentPrompt();
    return this.codingAgentPrompt;
  }

  private getClient(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY;
    const baseURL = process.env.OPENAI_API_BASE_URL;

    if (!apiKey) {
      throw new ServiceUnavailableException('OPENAI_API_KEY 未配置，无法调用大模型');
    }
    if (!baseURL) {
      throw new ServiceUnavailableException('OPENAI_API_BASE_URL 未配置，无法调用大模型');
    }

    return new OpenAI({
      apiKey,
      baseURL,
    });
  }

  private getModel(): string {
    return process.env.OPENAI_MODEL ?? 'kimi-k2-0905-preview';
  }

  /**
   * 流式请求：产出助手回复与状态事件（思考/工具调用/内容），支持 tool 调用循环与 workspace 系统提示
   * @param params.content 用户当前消息内容
   * @param params.history 历史消息
   * @param params.workspaceRoot 工作区根目录；传入时注入 coding agent 系统提示并启用工具
   * @param params.selectedElements 用户当前在预览中选中的元素，作为上下文帮助优先定位文件与行
   */
  async *streamChat(params: {
    content: string;
    selectedElements?: Array<SelectedElement>;
    workspaceRoot?: string;
  }): AsyncGenerator<StreamChatEvent> {
    const { content, selectedElements, workspaceRoot } = params;
    const client = this.getClient();
    const model = this.getModel();

    this.messages.push({ role: 'user', content: buildUserPrompt(content, selectedElements) });

    let turns = 0;
    try {
      while (turns < AGENT_MAX_TURNS) {
        turns += 1;

        const stream = await client.chat.completions.create({
          model,
          messages: this.messages,
          stream: true,
          tools: TOOL_SCHEMA,
          tool_choice: 'auto',
        });

        const toolCallsAccum: AccumulatedToolCall[] = [];
        let accumulatedContent = '';
        let contentPhaseEmitted = false;

        yield { type: 'status', phase: 'thinking' };

        for await (const chunk of stream) {
          const choice = chunk.choices?.[0];
          const delta = choice?.delta;
          const finishReason = choice?.finish_reason;

          if (delta?.content) {
            if (!contentPhaseEmitted) {
              contentPhaseEmitted = true;
              yield { type: 'status', phase: 'content' };
            }
            accumulatedContent += delta.content;
            yield { type: 'content', chunk: delta.content };
          }

          if (delta?.tool_calls?.length) {
            for (const d of delta.tool_calls) {
              const i = d.index ?? 0;
              if (!toolCallsAccum[i]) {
                toolCallsAccum[i] = {
                  id: (d as { id?: string }).id ?? '',
                  type: 'function',
                  function: { name: '', arguments: '' },
                };
              }
              const acc = toolCallsAccum[i];
              if ((d as { id?: string }).id) acc.id = (d as { id?: string }).id!;
              if (d.function?.name) acc.function.name += d.function.name ?? '';
              if (d.function?.arguments) acc.function.arguments += d.function.arguments ?? '';
            }
          }

          if (finishReason === 'stop' || finishReason === 'length') {
            yield { type: 'status', phase: 'done' };
            return;
          }

          if (finishReason === 'tool_calls' && toolCallsAccum.length > 0) {
            const toolCallsForApi: OpenAI.Chat.ChatCompletionMessageToolCall[] = toolCallsAccum
              .filter((tc) => tc.id && tc.function.name)
              .map((tc) => ({
                id: tc.id,
                type: 'function' as const,
                function: { name: tc.function.name, arguments: tc.function.arguments },
              }));

            this.messages.push({
              role: 'assistant',
              content: accumulatedContent.trim() || null,
              tool_calls: toolCallsForApi,
            });

            yield { type: 'status', phase: 'tool_calls' };

            for (const tc of toolCallsForApi) {
              const fn = 'function' in tc ? tc.function : undefined;
              const args = (() => {
                try {
                  return JSON.parse(fn?.arguments ?? '{}') as Record<string, unknown>;
                } catch {
                  return {};
                }
              })();
              yield {
                type: 'tool_call_start',
                id: tc.id,
                name: fn?.name ?? '',
                arguments: args,
              };
              let toolResult: string;
              let ok = true;
              try {
                toolResult = await this.toolsService.executeTool(
                  fn?.name ?? '',
                  args,
                  workspaceRoot
                );
              } catch (toolErr) {
                ok = false;
                toolResult = toolErr instanceof Error ? toolErr.message : '工具执行失败';
              }
              this.messages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: toolResult,
              });
              yield {
                type: 'tool_call_end',
                id: tc.id,
                name: fn?.name ?? '',
                success: ok,
                resultSummary: toResultSummary(toolResult),
              };
            }
            break;
          }
        }
      }
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      const message = err instanceof Error ? err.message : '大模型调用失败';
      throw new ServiceUnavailableException(message);
    }
  }
}
