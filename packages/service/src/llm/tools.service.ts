/**
 * @file tools.service.ts
 * @author houfujian houfujian@jd.com
 * @description Coding agent 工具：读/写文件、列目录、搜索代码、执行命令、获取当前时间；支持本地工作区与 E2B 沙箱工作区（e2b://conversationId）
 */

import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as pathModule from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { SANDBOX_APP_PATH } from '../preview/sandbox.service';
import { SandboxService } from '../preview/sandbox.service';

const execAsync = promisify(exec);

const E2B_PREFIX = 'e2b://';
const SKIP_DIRS = new Set(['node_modules', '.git', '.vite', 'dist', '.turbo', '.next']);
const MAX_SEARCH_FILE_SIZE = 512 * 1024; // 512KB
const RUN_COMMAND_TIMEOUT_MS = 60_000;

export type ToolResult = { success: true; data: unknown } | { success: false; error: string };

@Injectable()
export class ToolsService {
  constructor(private readonly sandboxService: SandboxService) {}

  private static parseE2BConversationId(workspaceRoot?: string): string | null {
    if (!workspaceRoot || !workspaceRoot.startsWith(E2B_PREFIX)) return null;
    return workspaceRoot.slice(E2B_PREFIX.length).trim() || null;
  }

  private getWorkspaceRoot(override?: string): string {
    const base = override ?? process.env.WORKSPACE_ROOT ?? process.cwd();
    return pathModule.resolve(base);
  }

  /**
   * 解析路径并限制在 workspace 内，防止路径穿越
   */
  private resolveInWorkspace(workspaceRoot: string, relativePath: string): string {
    const resolved = pathModule.resolve(workspaceRoot, relativePath);
    const normalized = pathModule.normalize(resolved);
    if (!normalized.startsWith(pathModule.normalize(workspaceRoot))) {
      throw new Error(`Path escapes workspace: ${relativePath}`);
    }
    return resolved;
  }

  /** 沙箱内路径：限制在 SANDBOX_APP_PATH 下 */
  private resolveSandboxPath(relativePath: string): string {
    const joined = pathModule.join(SANDBOX_APP_PATH, relativePath);
    const normalized = pathModule.normalize(joined);
    if (!normalized.startsWith(pathModule.normalize(SANDBOX_APP_PATH))) {
      throw new Error(`Path escapes sandbox app: ${relativePath}`);
    }
    return normalized;
  }

  /**
   * get_current_time：返回当前日期时间
   */
  getCurrentTime(): ToolResult {
    const now = new Date();
    return {
      success: true,
      data: {
        iso: now.toISOString(),
        locale: now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      },
    };
  }

  /**
   * read_file：读取文件内容
   */
  async readFile(
    filePath: string,
    workspaceRoot?: string
  ): Promise<ToolResult> {
    const conversationId = ToolsService.parseE2BConversationId(workspaceRoot);
    if (conversationId) {
      try {
        const resolved = this.resolveSandboxPath(filePath);
        const content = await this.sandboxService.readFile(conversationId, resolved);
        return { success: true, data: { path: resolved, content } };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    }
    try {
      const root = this.getWorkspaceRoot(workspaceRoot);
      const resolved = this.resolveInWorkspace(root, filePath);
      const content = await fs.readFile(resolved, 'utf-8');
      return { success: true, data: { path: resolved, content } };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  /**
   * write_file：写入或覆盖文件
   */
  async writeFile(
    filePath: string,
    content: string,
    workspaceRoot?: string
  ): Promise<ToolResult> {
    const conversationId = ToolsService.parseE2BConversationId(workspaceRoot);
    if (conversationId) {
      try {
        const resolved = this.resolveSandboxPath(filePath);
        await this.sandboxService.writeFile(conversationId, resolved, content);
        return { success: true, data: { path: resolved, written: true } };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    }
    try {
      const root = this.getWorkspaceRoot(workspaceRoot);
      const resolved = this.resolveInWorkspace(root, filePath);
      await fs.mkdir(pathModule.dirname(resolved), { recursive: true });
      await fs.writeFile(resolved, content, 'utf-8');
      return { success: true, data: { path: resolved, written: true } };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  /**
   * list_directory：列出目录下的文件和子目录
   */
  async listDirectory(
    dirPath?: string,
    workspaceRoot?: string
  ): Promise<ToolResult> {
    const conversationId = ToolsService.parseE2BConversationId(workspaceRoot);
    if (conversationId) {
      try {
        const dir = dirPath ?? '.';
        const resolved = this.resolveSandboxPath(dir);
        const { dirs, files } = await this.sandboxService.listDirectory(conversationId, resolved);
        return { success: true, data: { path: resolved, dirs, files } };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    }
    try {
      const dir = dirPath ?? '.';
      const root = this.getWorkspaceRoot(workspaceRoot);
      const resolved = this.resolveInWorkspace(root, dir);
      const stat = await fs.stat(resolved);
      if (!stat.isDirectory()) {
        return { success: false, error: `Not a directory: ${dir}` };
      }
      const entries = await fs.readdir(resolved, { withFileTypes: true });
      const fileList: string[] = [];
      const dirList: string[] = [];
      for (const e of entries) {
        if (e.isDirectory()) dirList.push(e.name + '/');
        else fileList.push(e.name);
      }
      dirList.sort();
      fileList.sort();
      const data = { path: resolved, dirs: dirList, files: fileList };
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  /**
   * 简单 glob 匹配：支持 .ts、.tsx 等扩展名或 pattern 字符串
   */
  private matchGlob(filePath: string, pattern: string): boolean {
    if (!pattern) return true;
    const name = pathModule.basename(filePath);
    if (pattern.startsWith('**/')) {
      const suffix = pattern.slice(3);
      return name === suffix || name.endsWith(suffix.replace('*', ''));
    }
    if (pattern.startsWith('*.')) {
      const ext = pattern.slice(1);
      return name.endsWith(ext) || name === ext.slice(1);
    }
    return name === pattern || name.includes(pattern);
  }

  /**
   * search_code：在代码库中搜索文本
   */
  async searchCode(
    query: string,
    scopePath?: string,
    filePattern?: string,
    workspaceRoot?: string
  ): Promise<ToolResult> {
    const conversationId = ToolsService.parseE2BConversationId(workspaceRoot);
    if (conversationId) {
      try {
        const scope = scopePath ? this.resolveSandboxPath(scopePath) : SANDBOX_APP_PATH;
        const escaped = query.replace(/"/g, '\\"');
        const { stdout } = await this.sandboxService.runCommand(
          conversationId,
          `grep -rn "${escaped}" "${scope}" 2>/dev/null || true`
        );
        const results: Array<{ path: string; line: number; content: string }> = [];
        for (const raw of (stdout ?? '').trim().split('\n').filter(Boolean)) {
          const m = raw.match(/:(\d+):(.*)$/);
          if (!m) continue;
          const pathStr = raw.slice(0, (m.index ?? 0));
          const lineNum = parseInt(m[1], 10) || 1;
          const content = m[2].trim();
          results.push({
            path: pathModule.relative(SANDBOX_APP_PATH, pathStr),
            line: lineNum,
            content,
          });
        }
        return {
          success: true,
          data: { query, count: results.length, results: results.slice(0, 100) },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    }
    try {
      const root = this.getWorkspaceRoot(workspaceRoot);
      const scope = scopePath
        ? this.resolveInWorkspace(root, scopePath)
        : root;
      const results: Array<{ path: string; line: number; content: string }> = [];
      const queryLower = query.toLowerCase();
      const isRegex = /^\/.+\/$/.test(query);
      const regex = isRegex ? new RegExp(query.slice(1, -1), 'i') : null;

      const searchInDir = async (dir: string): Promise<void> => {
        const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
        for (const e of entries) {
          const full = pathModule.join(dir, e.name);
          if (e.isDirectory()) {
            if (!SKIP_DIRS.has(e.name)) await searchInDir(full);
            continue;
          }
          if (!this.matchGlob(full, filePattern ?? '*')) continue;
          const stat = await fs.stat(full).catch(() => null);
          if (stat && stat.size > MAX_SEARCH_FILE_SIZE) continue;
          const content = await fs.readFile(full, 'utf-8').catch(() => '');
          const lines = content.split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const matched = regex ? regex.test(line) : line.toLowerCase().includes(queryLower);
            if (matched) {
              results.push({
                path: pathModule.relative(root, full),
                line: i + 1,
                content: line.trim(),
              });
            }
          }
        }
      };

      const stat = await fs.stat(scope);
      if (stat.isFile()) {
        const content = await fs.readFile(scope, 'utf-8');
        const lines = content.split(/\r?\n/);
        const queryLower2 = query.toLowerCase();
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(queryLower2)) {
            results.push({
              path: pathModule.relative(root, scope),
              line: i + 1,
              content: lines[i].trim(),
            });
          }
        }
      } else {
        await searchInDir(scope);
      }

      return {
        success: true,
        data: { query, count: results.length, results: results.slice(0, 100) },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  /**
   * run_command：在指定目录执行 shell 命令
   */
  async runCommand(
    command: string,
    cwd?: string,
    workspaceRoot?: string
  ): Promise<ToolResult> {
    const conversationId = ToolsService.parseE2BConversationId(workspaceRoot);
    if (conversationId) {
      try {
        const workDir = cwd ? this.resolveSandboxPath(cwd) : SANDBOX_APP_PATH;
        const { stdout, stderr, exitCode } = await this.sandboxService.runCommandForTool(
          conversationId,
          command,
          workDir
        );
        return {
          success: true,
          data: {
            cwd: workDir,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode,
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    }
    try {
      const root = this.getWorkspaceRoot(workspaceRoot);
      const workDir = cwd ? this.resolveInWorkspace(root, cwd) : root;
      const { stdout, stderr } = await execAsync(command, {
        cwd: workDir,
        timeout: RUN_COMMAND_TIMEOUT_MS,
        maxBuffer: 2 * 1024 * 1024,
      });
      return {
        success: true,
        data: {
          cwd: workDir,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: 0,
        },
      };
    } catch (err: unknown) {
      const ex = err as { stdout?: string; stderr?: string; killed?: boolean; code?: number };
      const stdout = (ex.stdout ?? '').trim();
      const stderr = (ex.stderr ?? '').trim();
      const code = ex.killed ? -1 : (ex.code ?? -1);
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: true,
        data: {
          cwd: this.getWorkspaceRoot(workspaceRoot),
          stdout,
          stderr,
          exitCode: code,
          error: message,
        },
      };
    }
  }

  /**
   * 根据工具名和参数执行对应工具，返回供模型消费的 JSON 字符串
   */
  async executeTool(
    name: string,
    args: Record<string, unknown>,
    workspaceRoot?: string
  ): Promise<string> {
    const result: ToolResult = await (async (): Promise<ToolResult> => {
      switch (name) {
        case 'get_current_time':
          return this.getCurrentTime();
        case 'read_file': {
          const pathArg = args.path;
          if (typeof pathArg !== 'string') {
            return { success: false, error: 'Missing or invalid argument: path' };
          }
          return this.readFile(pathArg, workspaceRoot);
        }
        case 'write_file': {
          const pathArg = args.path;
          const contentArg = args.content;
          if (typeof pathArg !== 'string' || typeof contentArg !== 'string') {
            return { success: false, error: 'Missing or invalid arguments: path, content' };
          }
          return this.writeFile(pathArg, contentArg, workspaceRoot);
        }
        case 'list_directory': {
          const pathArg = args.path;
          return this.listDirectory(
            typeof pathArg === 'string' ? pathArg : '.',
            workspaceRoot
          );
        }
        case 'search_code': {
          const queryArg = args.query;
          if (typeof queryArg !== 'string') {
            return { success: false, error: 'Missing or invalid argument: query' };
          }
          return this.searchCode(
            queryArg,
            typeof args.path === 'string' ? args.path : undefined,
            typeof args.file_pattern === 'string' ? args.file_pattern : undefined,
            workspaceRoot
          );
        }
        case 'run_command': {
          const commandArg = args.command;
          if (typeof commandArg !== 'string') {
            return { success: false, error: 'Missing or invalid argument: command' };
          }
          return this.runCommand(
            commandArg,
            typeof args.cwd === 'string' ? args.cwd : undefined,
            workspaceRoot
          );
        }
        default:
          return { success: false, error: `Unknown tool: ${name}` };
      }
    })();

    return JSON.stringify(result.success ? result.data : { error: result.error });
  }
}
