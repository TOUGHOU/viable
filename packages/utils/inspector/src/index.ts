/**
 * @file index.ts
 * @description Inspector 统一入口，通过 bundler 参数选择适配器
 */

import { createTurbopackRules } from './adapters/turbopack/plugin';
import { createVitePlugin } from './adapters/vite/plugin';
import type { InspectorOptions } from './shared/types';

export type {
  BundlerType,
  DropZoneInfo,
  ElementData,
  ErrorInfo,
  IframeInfoItem,
  InspectorOptions,
  InspectorPluginOptions,
  MessageType,
  Position,
  PropSchema,
  Rect,
  RuntimeConfig,
  ScrollRect,
  TransformConfig,
} from './shared/types';

export { createTurbopackRules } from './adapters/turbopack/plugin';
export { createVitePlugin } from './adapters/vite/plugin';
export { InspectorRuntime } from './runtime/inject';
export { DEFAULT_CONFIG, mergeConfig } from './shared/config';
export { CoreTransformer } from './transform/core/transformer';

/**
 * 统一插件工厂，根据 bundler 选择对应适配器
 *
 * @example Vite
 * ```ts
 * import { inspectorPlugin } from '@jd/vibe-inspector-plugin'
 * export default defineConfig({
 *   plugins: [inspectorPlugin({ bundler: 'vite' })]
 * })
 * ```
 *
 * @example Turbopack / Next.js >= 15.3
 * ```ts
 * import { inspectorPlugin } from '@jd/vibe-inspector-plugin'
 * const nextConfig = {
 *   turbopack: {
 *     rules: inspectorPlugin({ bundler: 'turbopack' })
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function inspectorPlugin(options: InspectorOptions): any {
  const { bundler, ...pluginOptions } = options;

  switch (bundler) {
    case 'vite':
      return createVitePlugin(pluginOptions);
    case 'turbopack':
      return createTurbopackRules(pluginOptions);
    default: {
      const _exhaustive: string = bundler;
      throw new Error(
        `[InspectorPlugin] 不支持的 bundler: "${_exhaustive}"，当前支持: "vite" | "turbopack"`
      );
    }
  }
}
