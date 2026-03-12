/**
 * @file: workspace.tsx
 * @description 页面二：对话 + 预览工作台
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { useChatStore } from '@/store/chatStore';
import { WorkspaceLayout } from '@/components/layout/workspaceLayout';
import { ConversationPanel } from '@/components/workspace/conversationPanel';
import { PreviewCodePanel } from '@/components/workspace/previewCodePanel';
import { getConversation, getMessages } from '@/lib/api/chatApi';

const POLL_INTERVAL_MS = 2000;

const conversationKey = (id: string) => ['workspace-conversation', id] as const;

export function WorkspacePage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { conversations, updateConversation, addConversation, setMessages } = useChatStore();
  const [hasChecked, setHasChecked] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const conversation = conversationId ? conversations.find((c) => c.id === conversationId) : null;

  const { data: convData, error: convError, isLoading: convLoading } = useSWR(
    conversationId ? conversationKey(conversationId) : null,
    () => getConversation({ id: conversationId! }),
    { dedupingInterval: 2000 }
  );

  // 对话详情拉取完成后写入 store 并拉取消息
  useEffect(() => {
    if (!conversationId || !convData) return;
    let cancelled = false;
    addConversation(convData);
    getMessages({ conversationId, page: 1, pageSize: 100 })
      .then((res) => {
        if (!cancelled) setMessages(conversationId, res.data);
      })
      .catch(() => {
        // 消息拉取失败仅留空列表，不阻塞页面
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
        if (!cancelled) setHasChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, convData, addConversation, setMessages]);

  useEffect(() => {
    if (convError && conversationId) {
      setDetailError(true);
      setHasChecked(true);
    }
  }, [convError, conversationId]);

  useEffect(() => {
    if (convLoading && !conversation) {
      setDetailLoading(true);
    }
  }, [convLoading, conversation]);

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
        <ConversationPanel conversationId={conversation.id} title={conversation.title} />
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
