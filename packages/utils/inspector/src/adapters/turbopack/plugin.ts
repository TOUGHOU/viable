/**
 * @file plugin.ts
 * @description Turbopack 规则工厂
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { InspectorPluginOptions } from '../../shared/types';

export function createTurbopackRules(options: InspectorPluginOptions = {}) {
  let currentDir: string;
  /* v8 ignore next 5 */
  if (typeof __dirname !== 'undefined') {
    currentDir = __dirname;
  } else {
    currentDir = dirname(fileURLToPath(import.meta.url));
  }

  const loaderPath = resolve(currentDir, 'adapters/turbopack/loader.cjs');

  const serializableOptions: InspectorPluginOptions = {};
  if (options.runtime != null) {
    serializableOptions.runtime = options.runtime;
  }
  if (options.transform != null) {
    serializableOptions.transform = options.transform;
  }

  return {
    '**/*.tsx': {
      loaders: [
        {
          loader: loaderPath,
          options: serializableOptions,
        },
      ],
    },
    '**/*.jsx': {
      loaders: [
        {
          loader: loaderPath,
          options: serializableOptions,
        },
      ],
    },
  };
}
