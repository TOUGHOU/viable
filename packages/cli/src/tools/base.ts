import type { Tool } from '../providers/types.js';

export function createTool(
  name: string,
  description: string,
  parameters: Record<string, unknown>,
  execute: (args: Record<string, unknown>) => Promise<string>
): Tool {
  return {
    name,
    description,
    parameters,
    execute,
  };
}

export function formatToolError(error: unknown): string {
  if (error instanceof Error) {
    return `错误: ${error.message}`;
  }
  return `错误: ${String(error)}`;
}
