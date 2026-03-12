/**
 * @file messageList.tsx
 * @description 消息列表，支持流式占位与长列表渲染优化
 */

import { MessageBubble } from './messageBubble';
import { cn } from '@/lib/utils';
import type { Message, StreamPhase, StreamToolCall } from '@/types/chat';

export interface MessageListProps {
  messages: Message[];
  streamingMessageId?: string | null;
  streamPhase?: StreamPhase | null;
  streamToolCalls?: StreamToolCall[];
  className?: string;
}

export function MessageList({
  messages,
  streamingMessageId = null,
  streamPhase = null,
  streamToolCalls = [],
  className,
}: MessageListProps) {
  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {messages.map((msg) => (
        <div
          key={msg.id}
          className="message-item min-h-[2.5rem]"
          style={{
            contentVisibility: 'auto',
            containIntrinsicSize: '0 2.5rem',
          }}
        >
          <MessageBubble
            message={msg}
            isStreaming={streamingMessageId != null && msg.id === streamingMessageId}
            streamPhase={msg.id === streamingMessageId ? streamPhase : null}
            streamToolCalls={msg.id === streamingMessageId ? streamToolCalls : []}
          />
        </div>
      ))}
    </div>
  );
}
