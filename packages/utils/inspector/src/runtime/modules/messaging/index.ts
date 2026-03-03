/**
 * @file index.ts
 * @description 消息通信模块
 */

import type { IMessageBus, Message, MessagePayload, MessageType } from '../../../shared/types';
import { createLogger } from '../../../shared/utils';

export class MessageBus implements IMessageBus {
  private handlers: Map<MessageType, Set<(payload: MessagePayload[MessageType]) => void>> = new Map();
  private logger: ReturnType<typeof createLogger>;
  private messageHandler: ((event: MessageEvent) => void) | null = null;

  constructor(private debug: boolean = false) {
    this.logger = createLogger('MessageBus', debug);
  }

  init(): void {
    this.messageHandler = this.handleMessage.bind(this);
    window.addEventListener('message', this.messageHandler);
    this.notifyScriptLoaded();
    this.logger.log('MessageBus initialized');
  }

  destroy(): void {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
    this.handlers.clear();
    this.logger.log('MessageBus destroyed');
  }

  send<T extends MessageType>(type: T, payload: MessagePayload[T]): void {
    if (window.parent && window.parent !== window) {
      const message: Message<T> = { type, payload };
      window.parent.postMessage(message, '*');
      this.logger.log('Sent message:', type, payload);
    }
  }

  on<T extends MessageType>(type: T, handler: (payload: MessagePayload[T]) => void): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as (payload: unknown) => void);
    this.logger.log('Registered handler for:', type);
  }

  off<T extends MessageType>(type: T, handler: (payload: MessagePayload[T]) => void): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.delete(handler as (payload: unknown) => void);
      if (handlers.size === 0) {
        this.handlers.delete(type);
      }
    }
  }

  private handleMessage(event: MessageEvent): void {
    if (event.source !== window.parent) {
      return;
    }

    const message = event.data as Message;
    if (!message || !message.type) {
      return;
    }

    this.logger.log('Received message:', message.type, message.payload);

    const handlers = this.handlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message.payload);
        } catch (error) {
          this.logger.error('Error in message handler:', error);
        }
      });
    }
  }

  private notifyScriptLoaded(): void {
    this.send('SELECTOR_SCRIPT_LOADED', {
      version: '2.0.0',
      timestamp: Date.now(),
    });
  }
}
