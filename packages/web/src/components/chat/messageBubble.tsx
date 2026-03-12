/**
 * @file messageBubble.tsx
 * @description 单条消息（用户/AI），支持 Markdown 渲染与流式「正在思考」状态
 */

import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import type { Message, StreamPhase, StreamToolCall } from '@/types/chat';

export interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  streamPhase?: StreamPhase | null;
  streamToolCalls?: StreamToolCall[];
  className?: string;
}

export function MessageBubble({
  message,
  isStreaming = false,
  streamPhase = null,
  streamToolCalls = [],
  className,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const useMarkdown = message.contentFormat === 'markdown' && !isUser;
  const showThinking =
    !isUser &&
    isStreaming &&
    (streamPhase === 'thinking' || (!message.content && streamPhase !== 'content'));
  const showToolCalls = !isUser && isStreaming && streamToolCalls.length > 0;

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
          'max-w-[80%] rounded-xl px-4 py-2.5 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground shadow-glow-sm'
            : 'bg-card/80 text-foreground border border-border/60 backdrop-blur-sm'
        )}
      >
        {showToolCalls && (
          <div className="space-y-1.5 py-0.5">
            {streamToolCalls.map((tc) => (
              <div
                key={tc.id}
                className="flex items-start gap-2 rounded-lg bg-background/40 px-2.5 py-1.5 text-xs"
              >
                {tc.status === 'running' ? (
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground" aria-hidden>
                    <span className="h-1.5 w-1.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  </span>
                ) : tc.success ? (
                  <span className="shrink-0 text-green-600 dark:text-green-400" aria-label="完成">✓</span>
                ) : (
                  <span className="shrink-0 text-destructive" aria-label="失败">✗</span>
                )}
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-foreground">{tc.name}</span>
                  {tc.arguments && Object.keys(tc.arguments).length > 0 && (
                    <span className="ml-1 text-muted-foreground">
                      ({Object.entries(tc.arguments)
                        .map(([k, v]) => `${k}: ${typeof v === 'string' ? (v.length > 30 ? v.slice(0, 30) + '…' : v) : JSON.stringify(v)}`)
                        .join(', ')})
                    </span>
                  )}
                  {tc.status === 'done' && tc.resultSummary != null && tc.resultSummary !== '' && (
                    <div className="mt-0.5 truncate text-muted-foreground">{tc.resultSummary}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {showThinking ? (
          <div className="flex items-center gap-1 py-0.5 text-accent/90">
            <span
              className="inline-flex gap-0.5"
              aria-label="正在思考"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70 animate-thinking" />
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70 animate-thinking [animation-delay:0.2s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70 animate-thinking [animation-delay:0.4s]" />
            </span>
            <span className="ml-1 text-xs">正在思考...</span>
          </div>
        ) : useMarkdown ? (
          <div className="prose prose-sm dark:prose-invert max-w-none break-words">
            <ReactMarkdown
              components={{
                pre: ({ children }) => (
                  <pre className="overflow-x-auto rounded-lg bg-background/50 p-3 text-xs border border-border/50">
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
                      className="rounded bg-background/50 px-1.5 py-0.5 text-xs border border-border/50"
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
