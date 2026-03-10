import fg from 'fast-glob';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { createTool, formatToolError } from './base.js';
import type { Tool } from '../providers/types.js';

export function createGlobTool(): Tool {
  return createTool(
    'glob',
    '使用 glob 模式搜索文件。返回匹配的文件路径列表。',
    {
      pattern: {
        type: 'string',
        description: 'glob 模式，如 "**/*.ts" 或 "src/**/*.tsx"',
      },
      cwd: {
        type: 'string',
        description: '搜索的根目录（可选，默认为当前目录）',
      },
    },
    async (args) => {
      try {
        const pattern = args.pattern as string;
        const cwd = (args.cwd as string) || process.cwd();

        const files = await fg(pattern, {
          cwd,
          ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
          onlyFiles: true,
        });

        if (files.length === 0) {
          return `没有找到匹配 "${pattern}" 的文件`;
        }

        return `找到 ${files.length} 个文件:\n${files.join('\n')}`;
      } catch (error) {
        return formatToolError(error);
      }
    }
  );
}

export function createGrepTool(): Tool {
  return createTool(
    'grep',
    '在文件中搜索文本或正则表达式。返回匹配的行和文件位置。',
    {
      pattern: {
        type: 'string',
        description: '搜索模式（支持正则表达式）',
      },
      path: {
        type: 'string',
        description: '要搜索的文件或目录路径',
      },
      filePattern: {
        type: 'string',
        description: '文件 glob 模式，如 "*.ts"（可选）',
      },
    },
    async (args) => {
      try {
        const searchPattern = args.pattern as string;
        const searchPath = resolve(process.cwd(), args.path as string);
        const filePattern = (args.filePattern as string) || '**/*';

        const regex = new RegExp(searchPattern, 'gi');
        const files = await fg(filePattern, {
          cwd: searchPath,
          ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
          onlyFiles: true,
          absolute: true,
        });

        const results: string[] = [];

        for (const file of files.slice(0, 50)) {
          // 限制搜索文件数
          try {
            const content = await readFile(file, 'utf-8');
            const lines = content.split('\n');

            lines.forEach((line, idx) => {
              if (regex.test(line)) {
                results.push(`${file}:${idx + 1}: ${line.trim()}`);
              }
            });
          } catch {
            // 跳过无法读取的文件
          }
        }

        if (results.length === 0) {
          return `没有找到匹配 "${searchPattern}" 的内容`;
        }

        const output = results.slice(0, 100); // 限制输出
        return `找到 ${results.length} 处匹配:\n${output.join('\n')}${results.length > 100 ? '\n...(更多结果已省略)' : ''}`;
      } catch (error) {
        return formatToolError(error);
      }
    }
  );
}
