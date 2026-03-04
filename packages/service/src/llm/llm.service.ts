/**
 * @file llm.service.ts
 * @author houfujian houfujian@jd.com
 * @description 大模型调用封装，OpenAI 或兼容接口
 */

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import OpenAI from 'openai';
import type { Message } from '../chat/storage/chat-storage.interface';

@Injectable()
export class LlmService {
  private getClient(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'OPENAI_API_KEY 未配置，无法调用大模型'
      );
    }
    const baseURL = process.env.LLM_API_BASE_URL;
    return new OpenAI({
      apiKey,
      ...(baseURL && { baseURL }),
    });
  }

  private getModel(): string {
    return process.env.LLM_MODEL ?? 'gpt-4o-mini';
  }

  /**
   * 非流式：请求大模型，返回完整回复文本
   */
  async chat(content: string, history: Message[]): Promise<string> {
    const client = this.getClient();
    const model = this.getModel();
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = history.map(
      (m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })
    );
    messages.push({ role: 'user', content });
    try {
      const completion = await client.chat.completions.create({
        model,
        messages,
        stream: false,
      });
      const choice = completion.choices?.[0];
      if (!choice?.message?.content) {
        throw new ServiceUnavailableException('大模型返回为空');
      }
      return choice.message.content;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '大模型调用失败';
      throw new ServiceUnavailableException(message);
    }
  }

  /**
   * 流式：按 chunk 返回助手回复
   */
  async *streamChat(
    content: string,
    history: Message[]
  ): AsyncGenerator<string> {
    const client = this.getClient();
    const model = this.getModel();
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = history.map(
      (m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })
    );
    messages.push({ role: 'user', content });
    const stream = await client.chat.completions.create({
      model,
      messages,
      stream: true,
    });
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta) yield delta;
    }
  }
}
