/**
 * @file: llm.service.ts
 * @author houfujian houfujian@jd.com
 * @description 大模型调用封装，仅流式请求，支持 tool 调用与 coding agent 系统提示
 */

import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import OpenAI from 'openai';
import { ToolsService } from './tool/tools.service';
import { getAgentPrompt } from './prompt/agent-prompt';
import { TOOL_SCHEMA } from './tool/tool-schema';
import { SelectedElement } from 'src/type';
import { buildUserPrompt } from './prompt/build-user-prompt';
import type { FinishReason, StepUsage, TextStreamPart, TotalUsage } from '@vibe/shared';

const AGENT_MAX_TURNS = 15;

/** 流式 chunk 中用于累积的 tool call */
interface AccumulatedToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

const MAX_RESULT_SUMMARY_LEN = 200;

function toResultSummary(raw: string): string {
  const s = String(raw).trim();
  if (s.length <= MAX_RESULT_SUMMARY_LEN) return s;
  return s.slice(0, MAX_RESULT_SUMMARY_LEN) + '…';
}

function mapFinishReason(reason: string | null | undefined): FinishReason {
  if (reason === 'stop') return 'stop';
  if (reason === 'length') return 'length';
  if (reason === 'tool_calls') return 'tool-calls';
  if (reason === 'content_filter') return 'content-filter';
  return 'other';
}

@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);
  private codingAgentPrompt: string | null = null;

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
  }): AsyncGenerator<TextStreamPart> {
    const { content, selectedElements, workspaceRoot } = params;
    const client = this.getClient();
    const model = this.getModel();
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: getAgentPrompt(workspaceRoot),
      },
      { role: 'user', content: buildUserPrompt(content, selectedElements) },
    ];

    let turns = 0;
    let stepIndex = 0;
    let totalUsage: TotalUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    yield { type: 'start' };

    try {
      while (turns < AGENT_MAX_TURNS) {
        turns += 1;
        stepIndex += 1;
        yield {
          type: 'start-step',
          request: {
            body: JSON.stringify({
              model,
              turn: turns,
              hasSelectedElements: Array.isArray(selectedElements) && selectedElements.length > 0,
              workspaceRoot: workspaceRoot ?? null,
            }),
          },
          warnings: [],
        };

        const stream = await client.chat.completions.create({
          model,
          messages,
          stream: true,
          tools: TOOL_SCHEMA,
          tool_choice: 'auto',
        });

        const toolCallsAccum: AccumulatedToolCall[] = [];
        let accumulatedContent = '';
        let stepUsage: StepUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
        const emittedStreamingStart = new Set<string>();
        let stepFinished = false;

        for await (const chunk of stream) {
          const choice = chunk.choices?.[0];
          const delta = choice?.delta;
          const finishReason = choice?.finish_reason;
          const usageFromChunk = (
            chunk as {
              usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
            }
          ).usage;
          if (usageFromChunk) {
            stepUsage = {
              inputTokens: usageFromChunk.prompt_tokens ?? 0,
              outputTokens: usageFromChunk.completion_tokens ?? 0,
              totalTokens: usageFromChunk.total_tokens ?? 0,
            };
          }

          if (delta?.content) {
            accumulatedContent += delta.content;
            yield { type: 'text', text: delta.content };
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
              if (d.function?.arguments) {
                acc.function.arguments += d.function.arguments ?? '';
                if (acc.id && acc.function.name) {
                  if (!emittedStreamingStart.has(acc.id)) {
                    emittedStreamingStart.add(acc.id);
                    yield {
                      type: 'tool-call-streaming-start',
                      toolCallId: acc.id,
                      toolName: acc.function.name,
                    };
                  }
                  yield {
                    type: 'tool-call-delta',
                    toolCallId: acc.id,
                    toolName: acc.function.name,
                    argsTextDelta: d.function.arguments,
                  };
                }
              }
            }
          }

          if (finishReason === 'tool_calls' && toolCallsAccum.length > 0) {
            const toolCallsForApi: OpenAI.Chat.ChatCompletionMessageToolCall[] = toolCallsAccum
              .filter((tc) => tc.id && tc.function.name)
              .map((tc) => ({
                id: tc.id,
                type: 'function' as const,
                function: { name: tc.function.name, arguments: tc.function.arguments },
              }));

            for (const tc of toolCallsForApi) {
              const fn = 'function' in tc ? tc.function : undefined;
              const argsText = fn?.arguments ?? '{}';
              const args = (() => {
                try {
                  return JSON.parse(argsText) as Record<string, unknown>;
                } catch {
                  return {};
                }
              })();
              yield {
                type: 'tool-call',
                toolCallId: tc.id,
                toolName: fn?.name ?? '',
                input: args,
              };
            }

            messages.push({
              role: 'assistant',
              content: accumulatedContent.trim() || null,
              tool_calls: toolCallsForApi,
            });

            for (const tc of toolCallsForApi) {
              const fn = 'function' in tc ? tc.function : undefined;
              const argsText = fn?.arguments ?? '{}';
              const args = (() => {
                try {
                  return JSON.parse(argsText) as Record<string, unknown>;
                } catch {
                  return {};
                }
              })();
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
              messages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: toolResult,
              });
              yield {
                type: 'tool-result',
                toolCallId: tc.id,
                toolName: fn?.name ?? '',
                input: args,
                output: { result: toResultSummary(toolResult), isError: !ok },
              };
            }

            totalUsage = {
              inputTokens: (totalUsage.inputTokens ?? 0) + (stepUsage.inputTokens ?? 0),
              outputTokens: (totalUsage.outputTokens ?? 0) + (stepUsage.outputTokens ?? 0),
              totalTokens:
                (totalUsage.totalTokens ?? 0) +
                (stepUsage.totalTokens ??
                  (stepUsage.inputTokens ?? 0) + (stepUsage.outputTokens ?? 0)),
            };
            yield {
              type: 'finish-step',
              response: {
                id: `resp_${stepIndex}`,
                modelId: model,
                timestamp: new Date().toISOString(),
                headers: {},
              },
              usage: stepUsage,
              finishReason: 'tool-calls',
              isContinued: true,
            };
            stepFinished = true;
            break;
          }

          if (finishReason && finishReason !== 'tool_calls') {
            const mapped = mapFinishReason(finishReason);
            totalUsage = {
              inputTokens: (totalUsage.inputTokens ?? 0) + (stepUsage.inputTokens ?? 0),
              outputTokens: (totalUsage.outputTokens ?? 0) + (stepUsage.outputTokens ?? 0),
              totalTokens:
                (totalUsage.totalTokens ?? 0) +
                (stepUsage.totalTokens ??
                  (stepUsage.inputTokens ?? 0) + (stepUsage.outputTokens ?? 0)),
            };
            yield {
              type: 'finish-step',
              response: {
                id: `resp_${stepIndex}`,
                modelId: model,
                timestamp: new Date().toISOString(),
                headers: {},
              },
              usage: stepUsage,
              finishReason: mapped,
              isContinued: false,
            };
            yield {
              type: 'finish',
              finishReason: mapped,
              totalUsage,
            };
            return;
          }
        }

        if (!stepFinished) {
          const mapped: FinishReason = 'other';
          totalUsage = {
            inputTokens: (totalUsage.inputTokens ?? 0) + (stepUsage.inputTokens ?? 0),
            outputTokens: (totalUsage.outputTokens ?? 0) + (stepUsage.outputTokens ?? 0),
            totalTokens:
              (totalUsage.totalTokens ?? 0) +
              (stepUsage.totalTokens ??
                (stepUsage.inputTokens ?? 0) + (stepUsage.outputTokens ?? 0)),
          };
          yield {
            type: 'finish-step',
            response: {
              id: `resp_${stepIndex}`,
              modelId: model,
              timestamp: new Date().toISOString(),
              headers: {},
            },
            usage: stepUsage,
            finishReason: mapped,
            isContinued: false,
          };
          yield {
            type: 'finish',
            finishReason: mapped,
            totalUsage,
          };
          return;
        }
      }
      yield {
        type: 'finish',
        finishReason: 'other',
        totalUsage,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : '大模型调用失败';
      yield { type: 'error', error: { message } };
      yield {
        type: 'finish',
        finishReason: 'error',
        totalUsage,
      };
    }
  }
}
