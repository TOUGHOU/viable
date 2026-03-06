/**
 * @file plugin.ts
 * @description Vite 插件适配器
 */

import { createRequire } from 'node:module';
import path from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import type { InspectorPluginOptions } from '../../shared/types';
import { createRuntimeBootstrapCode } from '../../shared/utils';
import { CoreTransformer } from '../../transform/core/transformer';

/** 使用 HTTP 路径避免浏览器将 virtual: 当作非法 scheme 触发 CORS */
const RUNTIME_PUBLIC_PATH = '/@vibe-inspector/runtime';
const RUNTIME_RESOLVED_ID = '\0vibe-inspector-runtime';

function injectRuntimeIntoReactRouterRoot(code: string, id: string): string {
  const normalizedId = id.split('?')[0];
  const isRootModule = /[/\\]src[/\\]root\.(t|j)sx?$/.test(normalizedId);

  if (!isRootModule) {
    return code;
  }

  if (
    code.includes(`import '${RUNTIME_PUBLIC_PATH}'`) ||
    code.includes(`import "${RUNTIME_PUBLIC_PATH}"`)
  ) {
    return code;
  }

  return `import '${RUNTIME_PUBLIC_PATH}';
${code}`;
}

export function createVitePlugin(options: InspectorPluginOptions = {}): Plugin {
  const { transform: transformConfig = {}, runtime: runtimeConfig = {} } = options;
  const enabled = transformConfig.enabled !== false;

  let transformer: CoreTransformer;
  let runtimeFilePath = '';

  return {
    name: 'vite-plugin-inspector',
    enforce: 'pre',

    configResolved(config: ResolvedConfig) {
      transformer = new CoreTransformer(transformConfig, config.root);

      const req = createRequire(path.join(config.root, 'package.json'));
      const pkgMain = req.resolve('@jd/vibe-inspector-plugin');
      runtimeFilePath = path.join(path.dirname(pkgMain), 'runtime/inject.js');
    },

    resolveId(id: string) {
      if (id === RUNTIME_PUBLIC_PATH || id.startsWith(RUNTIME_PUBLIC_PATH + '?')) {
        return RUNTIME_RESOLVED_ID;
      }
    },

    load(id: string) {
      if (id === RUNTIME_RESOLVED_ID) {
        return createRuntimeBootstrapCode(runtimeFilePath, runtimeConfig);
      }
    },

    transform(code: string, id: string) {
      if (!enabled) {
        return null;
      }
      const codeWithRuntime = injectRuntimeIntoReactRouterRoot(code, id);
      const transformed = transformer.transform(codeWithRuntime, id);

      if (transformed) {
        return transformed;
      }

      if (codeWithRuntime !== code) {
        return {
          code: codeWithRuntime,
          map: null,
        };
      }

      return null;
    },

    transformIndexHtml() {
      if (!enabled) {
        return [];
      }
      return [
        {
          tag: 'script',
          attrs: { type: 'module' },
          children: `import '${RUNTIME_PUBLIC_PATH}';`,
          injectTo: 'head' as const,
        },
      ];
    },
  };
}
