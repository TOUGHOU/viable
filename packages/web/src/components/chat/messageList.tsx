/**
 * @file: messageList.tsx
 * @description 消息列表，支持流式占位与长列表渲染优化
 */

import { MessageBubble } from './messageBubble';
import { cn } from '@/lib/utils';
import { INITIAL_STREAM_STAGES, type Message, type StreamStagesActive, type StreamToolCall } from '@/types/chat';

export interface MessageListProps {
  messages: Message[];
  streamingMessageId?: string | null;
  streamStages?: StreamStagesActive;
  streamToolCalls?: StreamToolCall[];
  className?: string;
}

export function MessageList({
  messages,
  streamingMessageId = null,
  streamStages = INITIAL_STREAM_STAGES,
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
            streamStages={msg.id === streamingMessageId ? streamStages : null}
            streamToolCalls={msg.id === streamingMessageId ? streamToolCalls : []}
          />
        </div>
      ))}
    </div>
  );
}
