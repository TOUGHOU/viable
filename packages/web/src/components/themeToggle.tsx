/**
 * @file themeToggle.tsx
 * @description 主题切换按钮：深色/亮色
 */

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThemeStore } from '@/store/themeStore';
import { cn } from '@/lib/utils';

export interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn(
        'h-9 w-9 rounded-lg text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground',
        className
      )}
      aria-label={theme === 'dark' ? '切换到亮色主题' : '切换到深色主题'}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
    </Button>
  );
}
