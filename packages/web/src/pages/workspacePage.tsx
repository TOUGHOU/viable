/**
 * @file workspacePage.tsx
 * @description 页面二：对话 + 预览工作台（仅展示有应用生成的对话）
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useChatStore } from '@/store/chatStore';
import { WorkspaceLayout } from '@/components/layout/workspaceLayout';
import { ConversationPanel } from '@/components/workspace/conversationPanel';
import { PreviewCodePanel } from '@/components/workspace/previewCodePanel';

export function WorkspacePage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { conversations } = useChatStore();

  const conversation = conversationId
    ? conversations.find((c) => c.id === conversationId)
    : null;

  if (!conversationId || !conversation) {
    navigate('/chat', { replace: true });
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
      previewPanel={
        <PreviewCodePanel
          previewUrl={undefined}
          codeFiles={[]}
        />
      }
    />
  );
}
