import { readFile, writeFile, stat } from 'fs/promises';
import { resolve, dirname } from 'path';
import { mkdir } from 'fs/promises';
import { createTool, formatToolError } from './base.js';
import type { Tool } from '../providers/types.js';

export function createReadTool(): Tool {
  return createTool(
    'read',
    '读取文件内容。返回文件的文本内容。',
    {
      path: {
        type: 'string',
        description: '要读取的文件路径（相对或绝对路径）',
      },
      startLine: {
        type: 'number',
        description: '开始读取的行号（可选，从 1 开始）',
      },
      endLine: {
        type: 'number',
        description: '结束读取的行号（可选）',
      },
    },
    async (args) => {
      try {
        const filePath = resolve(process.cwd(), args.path as string);
        const content = await readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        const startLine = (args.startLine as number) || 1;
        const endLine = (args.endLine as number) || lines.length;

        const selectedLines = lines.slice(startLine - 1, endLine);
        const numberedLines = selectedLines.map(
          (line, idx) => `${startLine + idx}: ${line}`
        );

        return numberedLines.join('\n');
      } catch (error) {
        return formatToolError(error);
      }
    }
  );
}

export function createWriteTool(): Tool {
  return createTool(
    'write',
    '写入内容到文件。如果文件不存在会创建它。',
    {
      path: {
        type: 'string',
        description: '要写入的文件路径',
      },
      content: {
        type: 'string',
        description: '要写入的内容',
      },
    },
    async (args) => {
      try {
        const filePath = resolve(process.cwd(), args.path as string);
        const dir = dirname(filePath);

        // 确保目录存在
        await mkdir(dir, { recursive: true });

        await writeFile(filePath, args.content as string, 'utf-8');
        return `已成功写入文件: ${filePath}`;
      } catch (error) {
        return formatToolError(error);
      }
    }
  );
}

export function createEditTool(): Tool {
  return createTool(
    'edit',
    '编辑文件中的特定内容。使用搜索和替换来修改文件。',
    {
      path: {
        type: 'string',
        description: '要编辑的文件路径',
      },
      search: {
        type: 'string',
        description: '要搜索的文本（精确匹配）',
      },
      replace: {
        type: 'string',
        description: '替换后的文本',
      },
    },
    async (args) => {
      try {
        const filePath = resolve(process.cwd(), args.path as string);
        const content = await readFile(filePath, 'utf-8');
        const search = args.search as string;
        const replace = args.replace as string;

        if (!content.includes(search)) {
          return `未找到要替换的文本: "${search.slice(0, 50)}${search.length > 50 ? '...' : ''}"`;
        }

        const newContent = content.replace(search, replace);
        await writeFile(filePath, newContent, 'utf-8');

        return `已成功编辑文件: ${filePath}`;
      } catch (error) {
        return formatToolError(error);
      }
    }
  );
}
