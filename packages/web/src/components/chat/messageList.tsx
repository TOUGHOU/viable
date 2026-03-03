/**
 * @file messageList.tsx
 * @description 消息列表
 */

import { MessageBubble } from './messageBubble';
import { cn } from '@/lib/utils';
import type { Message } from '@/types/chat';

export interface MessageListProps {
  messages: Message[];
  className?: string;
}

export function MessageList({ messages, className }: MessageListProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
    </div>
  );
}
