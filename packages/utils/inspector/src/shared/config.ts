/**
 * @file config.ts
 * @description 配置 Schema 定义
 */

import type { InspectorPluginOptions } from './types';

export const DEFAULT_CONFIG: Required<InspectorPluginOptions> = {
  runtime: {
    namespace: 'sc',
    debug: false,
    features: {
      selection: true,
      dragDrop: true,
    },
  },
  transform: {
    enabled: true,
    debug: false,
    includeElements: [],
    excludeElements: ['html', 'body', 'head', 'meta', 'style', 'script', 'link'],
  },
};

export function mergeConfig(userConfig: InspectorPluginOptions = {}): Required<InspectorPluginOptions> {
  return {
    runtime: {
      ...DEFAULT_CONFIG.runtime,
      ...userConfig.runtime,
      features: {
        ...DEFAULT_CONFIG.runtime.features,
        ...userConfig.runtime?.features,
      },
    },
    transform: {
      ...DEFAULT_CONFIG.transform,
      ...userConfig.transform,
    },
  };
}
