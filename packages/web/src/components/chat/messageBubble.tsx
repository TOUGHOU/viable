/**
 * @file messageBubble.tsx
 * @description 单条消息（用户/AI），支持 Markdown 渲染
 */

import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import type { Message } from '@/types/chat';

export interface MessageBubbleProps {
  message: Message;
  className?: string;
}

export function MessageBubble({ message, className }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const useMarkdown = message.contentFormat === 'markdown' && !isUser;

  return (
    <div
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start',
        className
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-3 py-2 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        )}
      >
        {useMarkdown ? (
          <div className="prose prose-sm dark:prose-invert max-w-none break-words">
            <ReactMarkdown
              components={{
                pre: ({ children }) => (
                  <pre className="overflow-x-auto rounded bg-muted/50 p-2 text-xs">
                    {children}
                  </pre>
                ),
                code: ({ className, children, ...props }) =>
                  className ? (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  ) : (
                    <code
                      className="rounded bg-muted/50 px-1 py-0.5 text-xs"
                      {...props}
                    >
                      {children}
                    </code>
                  ),
              }}
            >
              {message.content || ''}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}
      </div>
    </div>
  );
}
