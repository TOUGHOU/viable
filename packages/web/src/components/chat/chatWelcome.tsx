/**
 * @file: chatWelcome.tsx
 * @description 欢迎语 + 快捷问题列表
 */

import { cn } from '@/lib/utils';
import { QuickQuestionCard } from './quickQuestionCard';
import { QUICK_QUESTIONS } from '@/types/chat';

export interface ChatWelcomeProps {
  welcomeText?: string;
  onQuickQuestion: (text: string) => void;
  className?: string;
}

export function ChatWelcome({ welcomeText = '有什么我能帮你的吗?', className }: ChatWelcomeProps) {
  return (
    <div className={cn('flex flex-1 flex-col items-center justify-center gap-6 p-8', className)}>
      <p className="text-xl text-muted-foreground">{welcomeText}</p>
      <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
        {/* {QUICK_QUESTIONS.map((text) => (
          <QuickQuestionCard key={text} text={text} onClick={() => onQuickQuestion(text)} />
        ))} */}
      </div>
    </div>
  );
}
