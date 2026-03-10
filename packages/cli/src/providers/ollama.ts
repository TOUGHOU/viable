import { Ollama } from 'ollama';
import type {
  AIProvider,
  ChatOptions,
  ChatResponse,
  StreamChunk,
  Message,
} from './types.js';

export class OllamaProvider implements AIProvider {
  name = 'ollama';
  private client: Ollama;
  private model: string;

  constructor(baseUrl = 'http://localhost:11434', model = 'llama3.2') {
    this.client = new Ollama({ host: baseUrl });
    this.model = model;
  }

  private convertMessages(
    messages: Message[]
  ): Array<{ role: string; content: string }> {
    return messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    const { messages } = options;

    const response = await this.client.chat({
      model: this.model,
      messages: this.convertMessages(messages),
      stream: false,
    });

    return {
      content: response.message.content,
      usage: {
        inputTokens: response.prompt_eval_count || 0,
        outputTokens: response.eval_count || 0,
      },
    };
  }

  async *streamChat(options: ChatOptions): AsyncIterable<StreamChunk> {
    const { messages } = options;

    const stream = await this.client.chat({
      model: this.model,
      messages: this.convertMessages(messages),
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.message?.content) {
        yield { type: 'text', content: chunk.message.content };
      }

      if (chunk.done) {
        yield { type: 'done' };
      }
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.client.list();
      return true;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    const response = await this.client.list();
    return response.models.map((m) => m.name);
  }
}
