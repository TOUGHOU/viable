import OpenAI from 'openai';
import type {
  AIProvider,
  ChatOptions,
  ChatResponse,
  StreamChunk,
  Tool,
  Message,
} from './types.js';

export class MoonshotProvider implements AIProvider {
  name = 'moonshot';
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = 'kimi-k2-0905-preview') {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.moonshot.cn/v1',
    });
    this.model = model;
  }

  private convertTools(tools: Tool[]): OpenAI.ChatCompletionTool[] {
    return tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters,
          required: Object.keys(tool.parameters),
        },
      },
    }));
  }

  private convertMessages(
    messages: Message[]
  ): OpenAI.ChatCompletionMessageParam[] {
    return messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    const { messages, tools } = options;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: this.convertMessages(messages),
      tools: tools ? this.convertTools(tools) : undefined,
    });

    const choice = response.choices[0];
    const message = choice.message;

    const toolCalls = message.tool_calls?.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
    }));

    return {
      content: message.content || '',
      toolCalls: toolCalls?.length ? toolCalls : undefined,
      usage: response.usage
        ? {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
          }
        : undefined,
    };
  }

  async *streamChat(options: ChatOptions): AsyncIterable<StreamChunk> {
    const { messages, tools } = options;

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: this.convertMessages(messages),
      tools: tools ? this.convertTools(tools) : undefined,
      stream: true,
    });

    // 用于累积工具调用
    const pendingToolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map();

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        yield { type: 'text', content: delta.content };
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const index = tc.index;

          if (!pendingToolCalls.has(index)) {
            // 新的工具调用
            pendingToolCalls.set(index, {
              id: tc.id || '',
              name: tc.function?.name || '',
              arguments: tc.function?.arguments || '',
            });
          } else {
            // 累积参数
            const pending = pendingToolCalls.get(index)!;
            if (tc.id) pending.id = tc.id;
            if (tc.function?.name) pending.name = tc.function.name;
            if (tc.function?.arguments) pending.arguments += tc.function.arguments;
          }
        }
      }

      const finishReason = chunk.choices[0]?.finish_reason;
      if (finishReason === 'tool_calls' || finishReason === 'stop') {
        // 流结束，yield 所有累积的工具调用
        for (const [, tc] of pendingToolCalls) {
          if (tc.name) {
            let args: Record<string, unknown> = {};
            try {
              if (tc.arguments) {
                args = JSON.parse(tc.arguments);
              }
            } catch {
              // JSON 解析失败
            }
            yield {
              type: 'tool_call',
              toolCall: {
                id: tc.id,
                name: tc.name,
                arguments: args,
              },
            };
          }
        }
        pendingToolCalls.clear();

        if (finishReason === 'stop') {
          yield { type: 'done' };
        }
      }
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'hi' }],
      });
      return true;
    } catch {
      return false;
    }
  }
}
