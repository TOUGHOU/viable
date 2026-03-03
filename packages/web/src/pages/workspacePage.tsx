/**
 * @file: workspacePage.tsx
 * @description 页面二：对话 + 预览工作台
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatStore } from '@/store/chatStore';
import { WorkspaceLayout } from '@/components/layout/workspaceLayout';
import { ConversationPanel } from '@/components/workspace/conversationPanel';
import { PreviewCodePanel } from '@/components/workspace/previewCodePanel';

export function WorkspacePage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { conversations } = useChatStore();
  const [hasChecked, setHasChecked] = useState(false);

  const conversation = conversationId ? conversations.find((c) => c.id === conversationId) : null;

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

  return (
    <WorkspaceLayout
      conversationPanel={
        <ConversationPanel
          conversationId={conversation.id}
          title={conversation.title}
          showVersionSelect
        />
      }
      previewPanel={<PreviewCodePanel previewUrl="http://localhost:9876/" codeFiles={[]} />}
    />
  );
}
