import Anthropic from '@anthropic-ai/sdk';
import type {
  AIProvider,
  ChatOptions,
  ChatResponse,
  StreamChunk,
  Tool,
  Message,
} from './types.js';

export class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = 'claude-sonnet-4-20250514') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  private convertTools(tools: Tool[]): Anthropic.Tool[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object' as const,
        properties: tool.parameters,
        required: Object.keys(tool.parameters),
      },
    }));
  }

  private convertMessages(messages: Message[]): Anthropic.MessageParam[] {
    return messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
  }

  private getSystemPrompt(messages: Message[]): string | undefined {
    const systemMsg = messages.find((m) => m.role === 'system');
    return systemMsg?.content;
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    const { messages, tools } = options;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      system: this.getSystemPrompt(messages),
      messages: this.convertMessages(messages),
      tools: tools ? this.convertTools(tools) : undefined,
    });

    let content = '';
    const toolCalls: ChatResponse['toolCalls'] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input as Record<string, unknown>,
        });
      }
    }

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  async *streamChat(options: ChatOptions): AsyncIterable<StreamChunk> {
    const { messages, tools } = options;

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 8192,
      system: this.getSystemPrompt(messages),
      messages: this.convertMessages(messages),
      tools: tools ? this.convertTools(tools) : undefined,
    });

    // 用于累积工具调用的参数
    const pendingToolCalls: Map<number, { id: string; name: string; inputJson: string }> = new Map();

    for await (const event of stream) {
      // 调试：打印所有事件
      console.error('[DEBUG stream]', event.type, JSON.stringify(event).slice(0, 200));

      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if ('text' in delta) {
          yield { type: 'text', content: delta.text };
        } else if ('partial_json' in delta) {
          // 累积工具参数的 JSON 片段
          const pending = pendingToolCalls.get(event.index);
          if (pending) {
            pending.inputJson += delta.partial_json;
          }
        }
      } else if (event.type === 'content_block_start') {
        const block = event.content_block;
        if (block.type === 'tool_use') {
          // 开始一个新的工具调用，先记录下来
          pendingToolCalls.set(event.index, {
            id: block.id,
            name: block.name,
            inputJson: '',
          });
        }
      } else if (event.type === 'content_block_stop') {
        // 工具调用结束，解析完整的参数并 yield
        const pending = pendingToolCalls.get(event.index);
        if (pending) {
          let args: Record<string, unknown> = {};
          try {
            if (pending.inputJson) {
              args = JSON.parse(pending.inputJson);
            }
          } catch {
            // JSON 解析失败，使用空对象
          }
          yield {
            type: 'tool_call',
            toolCall: {
              id: pending.id,
              name: pending.name,
              arguments: args,
            },
          };
          pendingToolCalls.delete(event.index);
        }
      } else if (event.type === 'message_stop') {
        yield { type: 'done' };
      }
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.client.messages.create({
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
