/**
 * @file conversationPanel.tsx
 * @description 页面二左侧对话面板：消息列表 + 输入栏
 */

import { MessageList } from '@/components/chat/messageList';
import { ChatInputBar } from '@/components/chat/chatInputBar';
import { useChatStore, createMessage } from '@/store/chatStore';
import type { Message } from '@/types/chat';
import type { SkillId } from '@/types/chat';
import { useState, useRef } from 'react';
import {
  sendMessage as sendMessageApi,
  sendMessageStream as sendMessageStreamApi,
} from '@/lib/api/chatApi';

export interface ConversationPanelProps {
  conversationId: string;
  title?: string;
  showVersionSelect?: boolean;
  useStream?: boolean;
}

export function ConversationPanel({
  conversationId,
  title,
  showVersionSelect = true,
  useStream = true,
}: ConversationPanelProps) {
  const {
    getMessages,
    addMessage,
    setMessages,
    selectedSkill,
    setSelectedSkill,
  } = useChatStore();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamingIdRef = useRef<string | null>(null);
  const messages = getMessages(conversationId);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
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

      try {
        await sendMessageStreamApi(
          { conversationId, content: text },
          {
            onUserMessage() {},
            onContent(chunk) {
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
            },
            onAssistantMessage(assistantMessage) {
              const pid = streamingIdRef.current;
              streamingIdRef.current = null;
              const prev = getMessages(conversationId);
              const idx = prev.findIndex((m) => m.id === pid);
              const next =
                idx >= 0
                  ? prev.map((m, i) => (i === idx ? assistantMessage : m))
                  : [...prev, assistantMessage];
              setMessages(conversationId, next);
            },
            onError(msg) {
              setError(msg);
              const pid = streamingIdRef.current;
              streamingIdRef.current = null;
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
          const prev = getMessages(conversationId);
          setMessages(
            conversationId,
            prev.filter((m) => m.id !== pid)
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : '发送失败';
        setError(msg);
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
      });
      const prev = getMessages(conversationId);
      const withoutOptimistic = prev.filter((m) => m.id !== userMsg.id);
      setMessages(conversationId, [
        ...withoutOptimistic,
        userMessage,
        assistantMessage,
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '发送失败';
      setError(msg);
      const prev = getMessages(conversationId);
      setMessages(
        conversationId,
        prev.filter((m) => m.id !== userMsg.id)
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col ">
      {(title || showVersionSelect) && (
        <div className="flex items-center justify-between border-b border-border px-3 py-2 h-12">
          {title && <span className="text-sm font-medium truncate">{title}</span>}
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} className="p-4" />
      </div>
      {error && (
        <div className="px-3 py-2 text-sm text-destructive bg-destructive/10">
          {error}
        </div>
      )}
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
