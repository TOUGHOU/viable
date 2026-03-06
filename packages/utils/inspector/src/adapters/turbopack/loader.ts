/**
 * @file loader.ts
 * @description Turbopack loader - 在 TSX/JSX 中注入 Inspector 转换与运行时
 */

import path from 'node:path';
import type { InspectorPluginOptions } from '../../shared/types';
import { createRuntimeBootstrapCode } from '../../shared/utils';
import { CoreTransformer } from '../../transform/core/transformer';

const RUNTIME_MODULE_ID = '@jd/vibe-inspector-plugin/runtime/inject';

function isProvidersFile(resourcePath: string): boolean {
  const normalized = path.normalize(resourcePath);
  const baseName = path.basename(normalized);
  return /^providers\.(t|j)sx?$/i.test(baseName);
}

function injectRuntimeIntoProviders(
  code: string,
  resourcePath: string,
  runtimeConfig: InspectorPluginOptions['runtime']
): string {
  if (!isProvidersFile(resourcePath)) {
    return code;
  }
  const hasInspectorImport =
    code.includes("from '@jd/vibe-inspector-plugin/runtime/inject'") ||
    code.includes('from "@jd/vibe-inspector-plugin/runtime/inject"') ||
    code.includes('__inspectorRuntime');
  if (hasInspectorImport) {
    return code;
  }
  const bootstrap = createRuntimeBootstrapCode(RUNTIME_MODULE_ID, runtimeConfig);
  const useClientMatch = code.match(/^([\s\S]*?)(\s*['"]use client['"]\s*;?\s*\n)/);
  if (useClientMatch) {
    const [, before, directiveLine] = useClientMatch;
    const afterDirective = code.slice(before.length + directiveLine.length);
    return `${before}${directiveLine}${bootstrap}\n${afterDirective}`;
  }
  return `${bootstrap}\n${code}`;
}

let transformer: CoreTransformer | null = null;

function normalizeResourcePath(id: string): string {
  const i = id.indexOf('?');
  if (i !== -1) {
    return id.slice(0, i);
  }
  const j = id.indexOf('#');
  if (j !== -1) {
    return id.slice(0, j);
  }
  return id;
}

export default function inspectorTurbopackLoader(
  this: {
    getOptions: () => InspectorPluginOptions;
    rootContext?: string;
    resourcePath: string;
  },
  source: string
): string | undefined {
  const options = this.getOptions?.() ?? {};
  const { transform: transformConfig = {}, runtime: runtimeConfig = {} } = options;

  if (transformConfig.enabled === false) {
    return source;
  }

  const rootContext = this.rootContext || process.cwd();
  if (!transformer) {
    transformer = new CoreTransformer(transformConfig, rootContext);
  }

  const resourcePath = normalizeResourcePath(this.resourcePath ?? '');
  const codeWithRuntime = injectRuntimeIntoProviders(source, resourcePath, runtimeConfig);

  const result = transformer.transform(codeWithRuntime, resourcePath);

  if (result) {
    return result.code;
  }

  return codeWithRuntime !== source ? codeWithRuntime : source;
}
