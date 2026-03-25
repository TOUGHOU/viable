/**
 * @file: conversationPanel.tsx
 * @description 页面二左侧对话面板：消息列表 + 输入栏
 */

import { MessageList } from '@/components/chat/messageList';
import { ChatInputBar } from '@/components/chat/chatInputBar';
import { useChatStore, createMessage } from '@/store/chatStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { INITIAL_STREAM_STAGES, type Message, type SkillId, type StreamStagesActive, type StreamToolCall } from '@/types/chat';
import { useState, useRef, useEffect, useCallback, startTransition } from 'react';
import type { TextStreamPart } from '@vibe/shared';
import {
  sendMessage as sendMessageApi,
  sendMessageStream as sendMessageStreamApi,
} from '@/lib/api/chatApi';

export interface ConversationPanelProps {
  projectId: string;
  title?: string;
  useStream?: boolean;
}

export function ConversationPanel({ projectId, title, useStream = true }: ConversationPanelProps) {
  const { getMessages, addMessage, setMessages, selectedSkill, setSelectedSkill } = useChatStore();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedContent, setLastFailedContent] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamStages, setStreamStages] = useState<StreamStagesActive>(INITIAL_STREAM_STAGES);
  const [streamToolCalls, setStreamToolCalls] = useState<StreamToolCall[]>([]);
  const streamingIdRef = useRef<string | null>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const messages = getMessages(projectId);
  const selectedElements = useWorkspaceStore((s) => s.selectedElements);
  const setSelectedElements = useWorkspaceStore((s) => s.setSelectedElements);

  const scrollToBottom = useCallback(() => {
    const el = listScrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (sending && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, sending, scrollToBottom]);

  const sendWithText = useCallback(
    async (text: string) => {
      if (!text.trim() || sending) return;
      setError(null);
      setLastFailedContent(null);
      const userMsg = createMessage('user', text);
      addMessage(projectId, userMsg);
      setInput('');
      setSending(true);
      streamingIdRef.current = null;

      if (useStream) {
        const placeholderAssistant: Message = {
          id: `streaming-${Date.now()}`,
          role: 'assistant',
          content: '',
          contentFormat: 'markdown',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        addMessage(projectId, placeholderAssistant);
        streamingIdRef.current = placeholderAssistant.id;
        setStreamingMessageId(placeholderAssistant.id);
        setStreamStages(INITIAL_STREAM_STAGES);
        setStreamToolCalls([]);

        try {
          await sendMessageStreamApi(
            {
              projectId,
              content: text,
              selectedElements: selectedElements.length > 0 ? selectedElements : undefined,
            },
            {
              onPart(part: TextStreamPart) {
                if (part.type === 'start-step') {
                  startTransition(() =>
                    setStreamStages((prev) => ({ ...prev, thinking: true }))
                  );
                  return;
                }

                if (part.type === 'text') {
                  startTransition(() => {
                    setStreamStages((prev) => ({ ...prev, thinking: false, content: true }));
                    const prev = getMessages(projectId);
                    let lastAssistantIndex = -1;
                    for (let i = prev.length - 1; i >= 0; i--) {
                      if (prev[i].role === 'assistant') {
                        lastAssistantIndex = i;
                        break;
                      }
                    }
                    if (lastAssistantIndex === -1) return;
                    const updated = [...prev];
                    const last = { ...updated[lastAssistantIndex] };
                    last.content += part.text;
                    updated[lastAssistantIndex] = last;
                    setMessages(projectId, updated);
                  });
                  return;
                }

                if (part.type === 'tool-call') {
                  startTransition(() => {
                    setStreamStages((prev) => ({
                      ...prev,
                      thinking: false,
                      content: false,
                      tool_calls: true,
                    }));
                    setStreamToolCalls((prev) => [
                      ...prev,
                      {
                        id: part.toolCallId,
                        name: part.toolName,
                        status: 'running',
                        arguments: part.input as Record<string, unknown>,
                      },
                    ]);
                  });
                  return;
                }

                if (part.type === 'tool-result') {
                  const output = part.output as { isError?: boolean; result?: string };
                  startTransition(() => {
                    setStreamToolCalls((prev) =>
                      prev.map((tc) =>
                        tc.id === part.toolCallId
                          ? {
                              ...tc,
                              status: 'done' as const,
                              success: !output?.isError,
                              resultSummary:
                                typeof output?.result === 'string'
                                  ? output.result
                                  : JSON.stringify(part.output),
                            }
                          : tc
                      )
                    );
                    setStreamStages((prev) => ({ ...prev, tool_calls: false }));
                  });
                  return;
                }

                if (part.type === 'finish-step') {
                  startTransition(() =>
                    setStreamStages((prev) => ({ ...prev, thinking: false, content: false }))
                  );
                  return;
                }

                if (part.type === 'finish') {
                  const pid = streamingIdRef.current;
                  streamingIdRef.current = null;
                  setStreamingMessageId(null);
                  setStreamStages(INITIAL_STREAM_STAGES);
                  setStreamToolCalls([]);
                  if (part.finishReason === 'error') {
                    return;
                  }
                  const prev = getMessages(projectId);
                  const idx = prev.findIndex((m) => m.id === pid);
                  if (idx < 0) return;
                  const assistantMessage = {
                    ...prev[idx],
                    contentFormat: 'markdown' as const,
                    updatedAt: new Date().toISOString(),
                  };
                  const next = prev.map((m, i) => (i === idx ? assistantMessage : m));
                  setMessages(projectId, next);
                  setSelectedElements([]);
                }
              },
              onError(msg) {
                setError(msg);
                setLastFailedContent(text);
                const pid = streamingIdRef.current;
                streamingIdRef.current = null;
                setStreamingMessageId(null);
                setStreamStages(INITIAL_STREAM_STAGES);
                setStreamToolCalls([]);
                const prev = getMessages(projectId);
                setMessages(
                  projectId,
                  prev.filter((m) => m.id !== pid)
                );
              },
            }
          );
          const pid = streamingIdRef.current;
          if (pid) {
            setStreamingMessageId(null);
            setStreamStages(INITIAL_STREAM_STAGES);
            setStreamToolCalls([]);
            const prev = getMessages(projectId);
            setMessages(
              projectId,
              prev.filter((m) => m.id !== pid)
            );
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : '发送失败';
          setError(msg);
          setLastFailedContent(text);
          setStreamingMessageId(null);
          setStreamStages(INITIAL_STREAM_STAGES);
          setStreamToolCalls([]);
          const prev = getMessages(projectId);
          const pid = streamingIdRef.current;
          setMessages(
            projectId,
            prev.filter((m) => m.id !== userMsg.id && m.id !== (pid || ''))
          );
        } finally {
          setSending(false);
        }
        return;
      }

      try {
        const { userMessage, assistantMessage } = await sendMessageApi({
          projectId,
          content: text,
          selectedElements: selectedElements.length > 0 ? selectedElements : undefined,
        });
        const prev = getMessages(projectId);
        const withoutOptimistic = prev.filter((m) => m.id !== userMsg.id);
        setMessages(projectId, [...withoutOptimistic, userMessage, assistantMessage]);
        setSelectedElements([]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '发送失败';
        setError(msg);
        setLastFailedContent(text);
        const prev = getMessages(projectId);
        setMessages(
          projectId,
          prev.filter((m) => m.id !== userMsg.id)
        );
      } finally {
        setSending(false);
      }
    },
    [projectId, useStream, sending, getMessages, setMessages, addMessage, selectedElements]
  );

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (text) sendWithText(text);
  }, [input, sendWithText]);

  const handleRetry = useCallback(() => {
    if (lastFailedContent) {
      sendWithText(lastFailedContent);
    }
  }, [lastFailedContent, sendWithText]);

  const dismissError = useCallback(() => {
    setError(null);
    setLastFailedContent(null);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {title && (
        <div className="relative flex h-12 items-center justify-between border-b border-border/80 px-4 py-2">
          <span className="truncate font-display text-sm font-medium text-foreground">{title}</span>
        </div>
      )}
      <div ref={listScrollRef} className="flex-1 overflow-y-auto min-h-0">
        <MessageList
          messages={messages}
          streamingMessageId={streamingMessageId}
          streamStages={streamStages}
          streamToolCalls={streamToolCalls}
          className="p-4"
        />
      </div>
      {error ? (
        <div className="flex items-center justify-between gap-2 border-t border-border bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <span className="min-w-0 flex-1 truncate">{error}</span>
          <div className="flex shrink-0 items-center gap-1">
            {lastFailedContent ? (
              <button
                type="button"
                onClick={handleRetry}
                disabled={sending}
                className="rounded px-2 py-1 text-xs font-medium hover:bg-destructive/20 disabled:opacity-50"
              >
                重试
              </button>
            ) : null}
            <button
              type="button"
              onClick={dismissError}
              aria-label="关闭"
              className="rounded p-1 hover:bg-destructive/20"
            >
              <span aria-hidden>×</span>
            </button>
          </div>
        </div>
      ) : null}
      {selectedElements.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/30 px-3 py-2 text-sm">
          <span className="shrink-0 text-muted-foreground">已选:</span>
          {selectedElements.map((el) => (
            <span
              key={el.id}
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs text-foreground"
              title={`${el.filePath}:${el.lineNumber}:${el.col}`}
            >
              {el.name}
              <span className="text-muted-foreground">
                @ {el.fileName}:{el.lineNumber}
              </span>
            </span>
          ))}
          <button
            type="button"
            onClick={() => setSelectedElements([])}
            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="清除选中"
          >
            ×
          </button>
        </div>
      ) : null}
      <ChatInputBar
        value={input}
        onChange={setInput}
        onSend={handleSend}
        selectedSkill={selectedSkill}
        onSelectSkill={setSelectedSkill as (s: SkillId | null) => void}
        disabled={sending}
      />
    </div>
  );
}
