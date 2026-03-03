/**
 * @file transformer.ts
 * @description 核心转换器 - 框架无关的代码转换逻辑
 */

import path from 'node:path';
import { VALID_EXTENSIONS } from '../../shared/constants';
import type { ITransformer, TransformConfig, TransformContext } from '../../shared/types';
import { ASTParser } from './astParser';
import { CodeInjector } from './codeInjector';

export class CoreTransformer implements ITransformer {
  private astParser: ASTParser;
  private codeInjector: CodeInjector;
  private cwd: string;
  private debug: boolean;

  constructor(
    private config: TransformConfig = {},
    cwd?: string,
  ) {
    this.cwd = cwd || process.cwd();
    this.debug = config.debug ?? false;

    this.astParser = new ASTParser();
    this.codeInjector = new CodeInjector({
      includeElements: config.includeElements,
      excludeElements: config.excludeElements,
    });
  }

  transform(code: string, id: string) {
    if (!this.shouldTransform(id)) {
      return null;
    }

    const relativePath = path.relative(this.cwd, id);
    const fileName = path.basename(id);

    try {
      const ast = this.astParser.parse(code);
      const context: TransformContext = {
        code,
        id,
        relativePath,
        fileName,
      };

      const result = this.codeInjector.inject(code, ast, context);

      if (result && this.debug) {
        console.log(`[CoreTransformer] Transformed ${relativePath}`);
      }

      return result;
    } catch (error) {
      console.error(`[CoreTransformer] Error processing ${relativePath}:`, error);
      return null;
    }
  }

  private shouldTransform(id: string): boolean {
    if (id.includes('node_modules')) {
      return false;
    }

    const pathPart = id.includes('?') ? id.slice(0, id.indexOf('?')) : id;
    const pathPart2 = pathPart.includes('#') ? pathPart.slice(0, pathPart.indexOf('#')) : pathPart;
    const ext = path.extname(pathPart2);
    return VALID_EXTENSIONS.includes(ext);
  }
}
