/**
 * @file: llm.service.ts
 * @author houfujian houfujian@jd.com
 * @description 大模型调用封装，仅流式请求，支持 tool 调用与 coding agent 系统提示
 */

import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import OpenAI from 'openai';
import type { Message } from '../chat/storage/chat-storage.interface';
import { ToolsService } from './tools.service';

const AGENT_MAX_TURNS = 15;
const CODING_AGENT_PROMPT_FILENAME = 'coding-agent.prompt.md';

/** 按优先级尝试的 prompt 路径：运行时 __dirname、dist/llm、源码 src/llm（Nest 构建后 .md 在 dist/llm 或需从 src 读） */
function getCodingAgentPromptPaths(): string[] {
  const cwd = process.cwd();
  return [
    path.join(__dirname, CODING_AGENT_PROMPT_FILENAME),
    path.join(cwd, 'dist', 'llm', CODING_AGENT_PROMPT_FILENAME),
    path.join(cwd, 'src', 'llm', CODING_AGENT_PROMPT_FILENAME),
  ];
}

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

const CHAT_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_current_time',
      description:
        'Get the current date and time. Use when you need to know the current time or date for context.',
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description:
        'Read the full contents of a file from the workspace. Use to inspect source code, config files, or any text file.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Absolute or relative path to the file',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description:
        'Create a new file or overwrite an existing file with the given content. Use to create or modify source code and config files.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Absolute or relative path where to write the file',
          },
          content: {
            type: 'string',
            description: 'Full content to write to the file',
          },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description:
        'List files and directories at the given path. Use to explore project structure or find files.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory path to list. Defaults to workspace root if omitted.',
            default: '.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_code',
      description:
        'Search for text or pattern in the codebase. Use to find definitions, usages, or specific code snippets.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (keyword or regex pattern)',
          },
          path: {
            type: 'string',
            description: 'Optional directory or file path to limit search scope',
          },
          file_pattern: {
            type: 'string',
            description: 'Optional glob to filter files, e.g. "*.ts" or "**/*.tsx"',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description:
        'Run a shell command in the workspace (e.g. install deps, run tests, build). Use for npm/pnpm/yarn, git, or other CLI tools.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The shell command to execute',
          },
          cwd: {
            type: 'string',
            description: 'Working directory for the command. Defaults to workspace root.',
          },
        },
        required: ['command'],
      },
    },
  },
];

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
    const paths = getCodingAgentPromptPaths();
    for (const filePath of paths) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        this.codingAgentPrompt = content;
        return content;
      } catch {
        continue;
      }
    }
    this.logger.warn(
      `Coding agent prompt not found (tried: ${paths.join(', ')})`
    );
    return null;
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
    history: Message[];
    workspaceRoot?: string;
    selectedElements?: Array<{
      id: string;
      name: string;
      type: string;
      filePath: string;
      fileName: string;
      lineNumber: number;
      col: number;
      floorId?: string;
      rect: { left: number; top: number; width: number; height: number; right: number; bottom: number };
    }>;
  }): AsyncGenerator<StreamChatEvent> {
    const { content, history, workspaceRoot, selectedElements } = params;
    const client = this.getClient();
    const model = this.getModel();

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = history.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    if (workspaceRoot) {
      const systemPrompt = await this.loadCodingAgentPrompt();
      if (systemPrompt) {
        let fullSystem = systemPrompt;
        if (selectedElements?.length) {
          const selectedContext = [
            '',
            '---',
            '## 用户当前选中的元素（预览）',
            '用户在预览中选中了以下元素，请优先以这些位置为上下文进行查找或修改：',
            ...selectedElements.map(
              (el) =>
                `- **${el.name}**：\`${el.filePath}\` 第 ${el.lineNumber} 行、第 ${el.col} 列（id: \`${el.id}\`）`
            ),
            '',
          ].join('\n');
          fullSystem += selectedContext;
        }
        messages.unshift({ role: 'system', content: fullSystem });
      }
    }

    messages.push({ role: 'user', content });

    let turns = 0;
    try {
      while (turns < AGENT_MAX_TURNS) {
        turns += 1;
        const stream = await client.chat.completions.create({
          model,
          messages,
          stream: true,
          tools: CHAT_TOOLS,
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

            messages.push({
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
                toolResult =
                  toolErr instanceof Error ? toolErr.message : '工具执行失败';
              }
              messages.push({
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
