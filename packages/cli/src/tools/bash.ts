/**
 * @file: bash.ts
 * @author: houfujian houfujian@jd.com
 */
import { spawn } from 'child_process';
import { createTool, formatToolError } from './base.js';
import type { Tool } from '../providers/types.js';

export function createBashTool(): Tool {
  return createTool(
    'bash',
    '执行 bash 命令。返回命令的输出结果。',
    {
      command: {
        type: 'string',
        description: '要执行的 bash 命令',
      },
      timeout: {
        type: 'number',
        description: '超时时间（毫秒），默认 30000',
      },
    },
    async (args) => {
      const command = args.command as string;
      const timeout = (args.timeout as number) || 30000;

      // 调试：打印收到的参数
      console.error('[DEBUG bash] args:', JSON.stringify(args));

      if (!command) {
        return '错误: 未提供要执行的命令 (command 参数为空)';
      }

      // 安全检查：阻止危险命令
      const dangerousPatterns = [
        /rm\s+-rf\s+[\/~]/i,
        /:\(\)\s*\{\s*:\|:\s*&\s*\}\s*;/, // fork bomb
        />\s*\/dev\/sd[a-z]/i,
        /mkfs\./i,
        /dd\s+if=/i,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(command)) {
          return '错误: 检测到潜在危险命令，拒绝执行';
        }
      }

      return new Promise((resolve) => {
        const child = spawn('bash', ['-c', command], {
          cwd: process.cwd(),
          timeout,
          env: { ...process.env },
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve(stdout || '(命令执行成功，无输出)');
          } else {
            resolve(`退出码: ${code}\n${stderr || stdout}`);
          }
        });

        child.on('error', (error) => {
          resolve(formatToolError(error));
        });
      });
    }
  );
}
