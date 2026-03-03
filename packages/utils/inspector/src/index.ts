/**
 * @file index.ts
 * @description Vibe Coding Inspector - public API
 */

export function inspect(value: unknown): string {
  return typeof value === 'object' && value !== null
    ? JSON.stringify(value, null, 2)
    : String(value);
}

export type { InspectOptions } from './types';
