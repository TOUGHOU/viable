import OpenAI from 'openai';
import type {
  AIProvider,
  ChatOptions,
  ChatResponse,
  StreamChunk,
  Tool,
  Message,
} from './types.js';

export class OpenAIProvider implements AIProvider {
  name = 'openai';
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = 'gpt-4o') {
    this.client = new OpenAI({ apiKey });
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

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        yield { type: 'text', content: delta.content };
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.function?.name) {
            yield {
              type: 'tool_call',
              toolCall: {
                id: tc.id || '',
                name: tc.function.name,
                arguments: tc.function.arguments
                  ? (JSON.parse(tc.function.arguments) as Record<
                      string,
                      unknown
                    >)
                  : {},
              },
            };
          }
        }
      }

      if (chunk.choices[0]?.finish_reason === 'stop') {
        yield { type: 'done' };
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
