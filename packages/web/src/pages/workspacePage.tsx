/**
 * @file: workspacePage.tsx
 * @description 页面二：对话 + 预览工作台
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatStore } from '@/store/chatStore';
import { WorkspaceLayout } from '@/components/layout/workspaceLayout';
import { ConversationPanel } from '@/components/workspace/conversationPanel';
import { PreviewCodePanel } from '@/components/workspace/previewCodePanel';
import { getConversation, getMessages } from '@/lib/api/chatApi';

const POLL_INTERVAL_MS = 2000;

export function WorkspacePage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { conversations, updateConversation, addConversation, setMessages } = useChatStore();
  const [hasChecked, setHasChecked] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const conversation = conversationId ? conversations.find((c) => c.id === conversationId) : null;

  // 进入页面后根据对话 id 拉取对话详情（若 store 中无该会话则请求并写入 store）
  useEffect(() => {
    if (!conversationId) return;
    const inStore = useChatStore.getState().conversations.some((c) => c.id === conversationId);
    if (inStore) {
      setHasChecked(true);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(false);
    getConversation({ id: conversationId })
      .then(async (conv) => {
        if (cancelled) return;
        addConversation(conv);
        try {
          const { data } = await getMessages({ conversationId, page: 1, pageSize: 100 });
          if (!cancelled) setMessages(conversationId, data);
        } catch {
          // 消息拉取失败仅留空列表，不阻塞页面
        }
        setHasChecked(true);
      })
      .catch(() => {
        if (!cancelled) {
          setDetailError(true);
          setHasChecked(true);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, addConversation, setMessages]);

  // 等待 persist rehydrate 后再决定是否依赖 store 中的会话
  useEffect(() => {
    if (!conversationId) return;
    const inStore = useChatStore.getState().conversations.some((c) => c.id === conversationId);
    if (inStore) setHasChecked(true);
    const unsub = useChatStore.subscribe(() => {
      const found = useChatStore.getState().conversations.some((c) => c.id === conversationId);
      if (found) setHasChecked(true);
    });
    const t = setTimeout(() => setHasChecked(true), 150);
    return () => {
      unsub();
      clearTimeout(t);
    };
  }, [conversationId]);

  // 轮询预览状态：pending 时定期拉取 getConversation 并更新 store
  useEffect(() => {
    if (!conversationId || !conversation || conversation.previewStatus !== 'pending') {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }
    const tick = async () => {
      try {
        const updated = await getConversation({ id: conversationId });
        updateConversation(conversationId, {
          previewPort: updated.previewPort,
          previewUrl: updated.previewUrl,
          previewStatus: updated.previewStatus,
        });
      } catch {
        // ignore
      }
    };
    pollTimerRef.current = setInterval(tick, POLL_INTERVAL_MS);
    tick();
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [conversationId, conversation?.previewStatus, updateConversation]);

  // 无会话或拉取详情失败时跳回 /chat
  useEffect(() => {
    if (!hasChecked) return;
    if (!conversationId || detailError || !conversation) {
      navigate('/chat', { replace: true });
    }
  }, [hasChecked, conversationId, conversation, detailError, navigate]);

  if (!hasChecked || !conversationId) {
    return null;
  }

  if (detailLoading && !conversation) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        加载对话详情…
      </div>
    );
  }

  if (detailError || !conversation) {
    return null;
  }

  const previewUrl =
    conversation.previewStatus === 'running' ? (conversation.previewUrl ?? null) : null;

  return (
    <WorkspaceLayout
      conversationPanel={
        <ConversationPanel
          conversationId={conversation.id}
          title={conversation.title}
        />
      }
      previewPanel={
        <PreviewCodePanel
          previewUrl={previewUrl}
          previewStatus={conversation.previewStatus}
          codeFiles={[]}
        />
      }
    />
  );
}
