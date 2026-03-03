/**
 * @file astParser.ts
 * @description AST 解析器 - 解析代码为 AST
 */

import { parse } from '@babel/parser';
import type { File } from '@babel/types';

export class ASTParser {
  parse(code: string): File {
    return parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy'],
    });
  }
}
