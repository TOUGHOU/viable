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
import { getConversation } from '@/lib/api/chatApi';

const POLL_INTERVAL_MS = 2000;

export function WorkspacePage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { conversations, updateConversation } = useChatStore();
  const [hasChecked, setHasChecked] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const conversation = conversationId ? conversations.find((c) => c.id === conversationId) : null;

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

  // 等待 persist  rehydrate 后再决定是否重定向，避免刷新后误判
  useEffect(() => {
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

  useEffect(() => {
    if (!hasChecked) return;
    if (!conversationId || !conversation) {
      navigate('/chat', { replace: true });
    }
  }, [hasChecked, conversationId, conversation, navigate]);

  if (!hasChecked || !conversationId || !conversation) {
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
          showVersionSelect
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
