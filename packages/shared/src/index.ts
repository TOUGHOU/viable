/**
 * @file: index.ts
 * @author: houfujian houfujian@jd.com
 * @description Shared utilities entry for @vibe/shared.
 */

export const SHARED_PACKAGE = '@vibe/shared';

export function getSharedPackageName(): string {
  return SHARED_PACKAGE;
}

export * from './types/messag';
