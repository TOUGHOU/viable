/**
 * @file skillButtonGroup.tsx
 * @description 技能按钮组，支持选中态
 */

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SkillId } from '@/types/chat';
import { SKILLS } from '@/types/chat';

export interface SkillButtonGroupProps {
  selectedSkill: SkillId | null;
  onSelectSkill: (skill: SkillId | null) => void;
  className?: string;
}

const SKILL_LABELS: Record<SkillId, string> = {
  quick: '快速',
  coding: '编程',
  research: '深入研究',
  image: '图像生成',
  write: '帮我写作',
  video: '视频生成',
  more: '更多',
};

export function SkillButtonGroup({ selectedSkill, onSelectSkill, className }: SkillButtonGroupProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {SKILLS.map((skill) => (
        <Button
          key={skill.id}
          type="button"
          variant={selectedSkill === skill.id ? 'default' : 'ghost'}
          size="sm"
          className={cn(
            'h-8 text-xs',
            skill.id === 'coding' && selectedSkill === 'coding' && 'bg-purple-600 hover:bg-purple-700'
          )}
          onClick={() => onSelectSkill(selectedSkill === skill.id ? null : skill.id)}
        >
          {skill.id === 'coding' && '<> '}
          {SKILL_LABELS[skill.id]}
        </Button>
      ))}
    </div>
  );
}
