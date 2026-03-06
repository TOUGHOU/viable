/**
 * @file: conversationPanel.tsx
 * @description 页面二左侧对话面板：消息列表 + 输入栏
 */

import { MessageList } from '@/components/chat/messageList';
import { ChatInputBar } from '@/components/chat/chatInputBar';
import { useChatStore, createMessage } from '@/store/chatStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import type { Message, SkillId, StreamPhase, StreamToolCall } from '@/types/chat';
import { useState, useRef, useEffect, useCallback, startTransition } from 'react';
import {
  sendMessage as sendMessageApi,
  sendMessageStream as sendMessageStreamApi,
} from '@/lib/api/chatApi';

export interface ConversationPanelProps {
  conversationId: string;
  title?: string;
  useStream?: boolean;
}

export function ConversationPanel({
  conversationId,
  title,
  useStream = true,
}: ConversationPanelProps) {
  const { getMessages, addMessage, setMessages, selectedSkill, setSelectedSkill } = useChatStore();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedContent, setLastFailedContent] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamPhase, setStreamPhase] = useState<StreamPhase | null>(null);
  const [streamToolCalls, setStreamToolCalls] = useState<StreamToolCall[]>([]);
  const streamingIdRef = useRef<string | null>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const messages = getMessages(conversationId);
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
      addMessage(conversationId, userMsg);
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
        addMessage(conversationId, placeholderAssistant);
        streamingIdRef.current = placeholderAssistant.id;
        setStreamingMessageId(placeholderAssistant.id);
        setStreamPhase(null);
        setStreamToolCalls([]);

        try {
          await sendMessageStreamApi(
            {
              conversationId,
              content: text,
              selectedElements: selectedElements.length > 0 ? selectedElements : undefined,
            },
            {
              onUserMessage() {},
              onStatus(phase) {
                startTransition(() => setStreamPhase(phase));
              },
              onToolCallStart(payload) {
                startTransition(() => {
                  setStreamToolCalls((prev) => [
                    ...prev,
                    {
                      id: payload.id,
                      name: payload.name,
                      status: 'running',
                      arguments: payload.arguments,
                    },
                  ]);
                });
              },
              onToolCallEnd(payload) {
                startTransition(() => {
                  setStreamToolCalls((prev) =>
                    prev.map((tc) =>
                      tc.id === payload.id
                        ? {
                            ...tc,
                            status: 'done' as const,
                            success: payload.success,
                            resultSummary: payload.resultSummary,
                          }
                        : tc
                    )
                  );
                });
              },
              onContent(chunk) {
                startTransition(() => {
                  const prev = getMessages(conversationId);
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
                  last.content += chunk;
                  updated[lastAssistantIndex] = last;
                  setMessages(conversationId, updated);
                });
              },
              onAssistantMessage(assistantMessage) {
                const pid = streamingIdRef.current;
                streamingIdRef.current = null;
                setStreamingMessageId(null);
                setStreamPhase(null);
                setStreamToolCalls([]);
                const prev = getMessages(conversationId);
                const idx = prev.findIndex((m) => m.id === pid);
                const next =
                  idx >= 0
                    ? prev.map((m, i) => (i === idx ? assistantMessage : m))
                    : [...prev, assistantMessage];
                setMessages(conversationId, next);
                setSelectedElements([]);
              },
              onError(msg) {
                setError(msg);
                setLastFailedContent(text);
                const pid = streamingIdRef.current;
                streamingIdRef.current = null;
                setStreamingMessageId(null);
                setStreamPhase(null);
                setStreamToolCalls([]);
                const prev = getMessages(conversationId);
                setMessages(
                  conversationId,
                  prev.filter((m) => m.id !== pid)
                );
              },
            }
          );
          const pid = streamingIdRef.current;
          if (pid) {
            setStreamingMessageId(null);
            setStreamPhase(null);
            setStreamToolCalls([]);
            const prev = getMessages(conversationId);
            setMessages(
              conversationId,
              prev.filter((m) => m.id !== pid)
            );
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : '发送失败';
          setError(msg);
          setLastFailedContent(text);
          setStreamingMessageId(null);
          setStreamPhase(null);
          setStreamToolCalls([]);
          const prev = getMessages(conversationId);
          const pid = streamingIdRef.current;
          setMessages(
            conversationId,
            prev.filter((m) => m.id !== userMsg.id && m.id !== (pid || ''))
          );
        } finally {
          setSending(false);
        }
        return;
      }

      try {
        const { userMessage, assistantMessage } = await sendMessageApi({
          conversationId,
          content: text,
          selectedElements: selectedElements.length > 0 ? selectedElements : undefined,
        });
        const prev = getMessages(conversationId);
        const withoutOptimistic = prev.filter((m) => m.id !== userMsg.id);
        setMessages(conversationId, [...withoutOptimistic, userMessage, assistantMessage]);
        setSelectedElements([]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '发送失败';
        setError(msg);
        setLastFailedContent(text);
        const prev = getMessages(conversationId);
        setMessages(
          conversationId,
          prev.filter((m) => m.id !== userMsg.id)
        );
      } finally {
        setSending(false);
      }
    },
    [conversationId, useStream, sending, getMessages, setMessages, addMessage, selectedElements]
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
        <div className="flex items-center justify-between border-b border-border px-3 py-2 h-12">
          {title && <span className="text-sm font-medium truncate">{title}</span>}
        </div>
      )}
      <div ref={listScrollRef} className="flex-1 overflow-y-auto min-h-0">
        <MessageList
          messages={messages}
          streamingMessageId={streamingMessageId}
          streamPhase={streamPhase}
          streamToolCalls={streamToolCalls}
          className="p-4"
        />
      </div>
      {error ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-destructive bg-destructive/10 border-t border-border">
          <span className="flex-1 min-w-0 truncate">{error}</span>
          <div className="flex items-center gap-1 shrink-0">
            {lastFailedContent ? (
              <button
                type="button"
                onClick={handleRetry}
                disabled={sending}
                className="px-2 py-1 rounded text-xs font-medium bg-destructive/20 hover:bg-destructive/30 disabled:opacity-50"
              >
                重试
              </button>
            ) : null}
            <button
              type="button"
              onClick={dismissError}
              aria-label="关闭"
              className="p-1 rounded hover:bg-destructive/20"
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
