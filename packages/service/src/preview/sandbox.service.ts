/**
 * @file: sandbox.service.ts
 * @author: houfujian houfujian@jd.com
 * @description E2B 沙箱能力：按会话创建/关闭沙箱，写入文件、安装依赖、后台启动 dev server、获取预览链接
 */
import { Injectable } from '@nestjs/common';
import { Sandbox } from '@e2b/code-interpreter';
import * as path from 'path';

export const SANDBOX_APP_PATH = '/home/user/app';
const DEFAULT_DEV_PORT = 5173;
const DEV_SERVER_READY_TIMEOUT_MS = 120_000;

export interface FileEntry {
  relativePath: string;
  data: string;
}

@Injectable()
export class SandboxService {
  private readonly sandboxMap = new Map<string, Sandbox>();
  /** 后台 dev server 进程句柄，用于 stopPreview 时 kill */
  private readonly devProcessMap = new Map<string, { kill: () => Promise<unknown> }>();

  /**
   * 为会话创建并记录沙箱
   */
  async createSandbox(conversationId: string): Promise<Sandbox> {
    const existing = this.sandboxMap.get(conversationId);
    if (existing) {
      console.log(`[Sandbox] ${conversationId} createSandbox: reuse existing`);
      return existing;
    }
    const sandbox = await Sandbox.create({
      timeoutMs: 10 * 1000 * 6,
      lifecycle: {
        onTimeout: 'pause',
        autoResume: true,
      },
    });
    this.sandboxMap.set(conversationId, sandbox);
    const id = this.getSandboxIdFromInstance(sandbox);
    console.log(`[Sandbox] ${conversationId} createSandbox: created sandboxId=${id}`);
    return sandbox;
  }

  /**
   * 检查沙箱状态：若内存中已有该会话的沙箱则检查是否仍存活；若传入 existingSandboxId 且内存中无实例则尝试连接后检查
   * @returns alive 是否存活，sandboxId 当前或检查的沙箱 id
   */
  async checkSandboxStatus(
    conversationId: string,
    existingSandboxId?: string
  ): Promise<{ alive: boolean; sandboxId?: string }> {
    const inMemory = this.sandboxMap.get(conversationId);
    if (inMemory) {
      try {
        const running = await inMemory.isRunning();
        const id = this.getSandboxIdFromInstance(inMemory);
        return { alive: running, sandboxId: id };
      } catch {
        this.sandboxMap.delete(conversationId);
        return { alive: false, sandboxId: this.getSandboxIdFromInstance(inMemory) };
      }
    }
    if (existingSandboxId) {
      try {
        const sandbox = await Sandbox.connect(existingSandboxId);
        const running = await sandbox.isRunning();
        if (running) {
          this.sandboxMap.set(conversationId, sandbox);
          return { alive: true, sandboxId: this.getSandboxIdFromInstance(sandbox) };
        }
        try {
          await sandbox.kill();
        } catch {
          // ignore
        }
        return { alive: false, sandboxId: existingSandboxId };
      } catch {
        return { alive: false, sandboxId: existingSandboxId };
      }
    }
    return { alive: false };
  }

  /**
   * 确保会话拥有可用沙箱：若已有沙箱则校验状态，若已销毁则重新创建并返回新 sandboxId
   * @returns sandbox、sandboxId 及 recreated（是否本次新创建/重建）
   */
  async ensureSandbox(
    conversationId: string,
    existingSandboxId?: string
  ): Promise<{ sandbox: Sandbox; sandboxId: string; recreated: boolean }> {
    const status = await this.checkSandboxStatus(conversationId, existingSandboxId);
    if (status.alive && status.sandboxId) {
      const sandbox = this.sandboxMap.get(conversationId);
      if (sandbox) {
        return { sandbox, sandboxId: status.sandboxId, recreated: false };
      }
    }
    if (this.sandboxMap.has(conversationId)) {
      await this.closeSandbox(conversationId);
    }
    const sandbox = await this.createSandbox(conversationId);
    const sandboxId = this.getSandboxIdFromInstance(sandbox);
    console.log(`[Sandbox] ${conversationId} ensureSandbox: (re)created sandboxId=${sandboxId}`);
    return { sandbox, sandboxId, recreated: true };
  }

  private getSandboxIdFromInstance(sandbox: Sandbox): string {
    return (sandbox as { sandboxId?: string }).sandboxId ?? 'unknown';
  }

  /**
   * 关闭并移除会话沙箱
   */
  async closeSandbox(conversationId: string): Promise<void> {
    const proc = this.devProcessMap.get(conversationId);
    if (proc) {
      this.devProcessMap.delete(conversationId);
      try {
        await proc.kill();
      } catch {
        // ignore
      }
    }
    const sandbox = this.sandboxMap.get(conversationId);
    if (!sandbox) return;
    this.sandboxMap.delete(conversationId);
    try {
      await sandbox.kill();
    } catch {
      // ignore
    }
  }

  getSandbox(conversationId: string): Sandbox | undefined {
    return this.sandboxMap.get(conversationId);
  }

  /**
   * 获取当前会话在内存中关联的沙箱 ID（若存在）
   */
  getSandboxId(conversationId: string): string | undefined {
    const sandbox = this.sandboxMap.get(conversationId);
    return sandbox ? this.getSandboxIdFromInstance(sandbox) : undefined;
  }

  /**
   * 将一批文件写入沙箱的 basePath 下（按 relativePath 落盘）
   */
  async writeFiles(conversationId: string, basePath: string, files: FileEntry[]): Promise<void> {
    const sandbox = this.sandboxMap.get(conversationId);
    if (!sandbox) throw new Error(`Sandbox not found: ${conversationId}`);

    const payload = files.map(({ relativePath, data }) => ({
      path: path.join(basePath, relativePath),
      data,
    }));
    await sandbox.files.write(payload as { path: string; data: string }[]);
    console.log(
      `[Sandbox] ${conversationId} writeFiles: wrote ${files.length} files to ${basePath}`
    );
  }

  /**
   * 在沙箱内执行命令（同步，等待结束）
   */
  async runCommand(
    conversationId: string,
    command: string,
    options?: {
      onStdout?: (data: string) => void;
      onStderr?: (data: string) => void;
    }
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const sandbox = this.sandboxMap.get(conversationId);
    if (!sandbox) throw new Error(`Sandbox not found: ${conversationId}`);
    try {
      const result = await sandbox.commands.run(command, options);
      const exitCode = result.exitCode ?? -1;
      const stdout = result.stdout ?? '';
      const stderr = result.stderr ?? '';
      if (exitCode !== 0) {
        console.error(
          `[Sandbox] ${conversationId} runCommand exitCode=${exitCode} command:`,
          command.slice(0, 150),
          'stdout:',
          stdout.slice(0, 400),
          'stderr:',
          stderr.slice(0, 400)
        );
      }
      return { stdout, stderr, exitCode };
    } catch (e) {
      const err = e as Error & { stdout?: string; stderr?: string; exitCode?: number };
      console.error(
        `[Sandbox] ${conversationId} runCommand threw:`,
        err.message,
        '| command:',
        command.slice(0, 120),
        '| exitCode:',
        err.exitCode,
        '| stdout:',
        (err.stdout ?? '').slice(0, 500),
        '| stderr:',
        (err.stderr ?? '').slice(0, 500)
      );
      const enriched = new Error(err.message || 'Sandbox command failed') as Error & {
        stdout?: string;
        stderr?: string;
        exitCode?: number;
      };
      enriched.stdout = err.stdout ?? '';
      enriched.stderr = err.stderr ?? '';
      enriched.exitCode = err.exitCode ?? -1;
      throw enriched;
    }
  }

  /**
   * 在沙箱内安装依赖
   */
  async installDependencies(
    conversationId: string,
    projectPath: string = SANDBOX_APP_PATH
  ): Promise<void> {
    console.log(
      `[Sandbox] ${conversationId} installDependencies: running npm install in ${projectPath}`
    );
    const { exitCode, stdout, stderr } = await this.runCommand(
      conversationId,
      `cd ${projectPath} && npm install`,
      {
        onStdout: (data: string) => {
          console.log('[npm]', data);
        },
        onStderr: (data: string) => {
          console.error('[npm]', data);
        },
      }
    );
    if (exitCode !== 0) {
      console.error(
        `[Sandbox] ${conversationId} installDependencies failed exitCode=${exitCode} stdout:`,
        stdout?.slice(0, 800),
        'stderr:',
        stderr?.slice(0, 800)
      );
      const err = new Error(
        `npm install failed (exit ${exitCode}): ${stderr || stdout || 'no output'}`
      ) as Error & { stdout?: string; stderr?: string; exitCode?: number };
      err.stdout = stdout;
      err.stderr = stderr;
      err.exitCode = exitCode;
      throw err;
    }
    console.log(`[Sandbox] ${conversationId} installDependencies: success`);
  }

  /**
   * 在沙箱内后台启动 dev server，通过 onStdout 监听 Vite 输出 "Local:" 判定就绪后调用 getHost 返回预览 URL（与 E2B 官方示例一致）
   */
  async startDevServerAndGetPreviewUrl(
    conversationId: string,
    projectPath: string = SANDBOX_APP_PATH,
    port: number = DEFAULT_DEV_PORT
  ): Promise<string> {
    const sandbox = this.sandboxMap.get(conversationId);
    if (!sandbox) throw new Error(`Sandbox not found: ${conversationId}`);

    const cmd = `cd ${projectPath} && npm run dev`;
    console.log(`[Sandbox] ${conversationId} startDevServer: running (background):`, cmd);

    const viteReady = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(`Vite did not print "Local:" within ${DEV_SERVER_READY_TIMEOUT_MS / 1000}s`)
        );
      }, DEV_SERVER_READY_TIMEOUT_MS);
      sandbox.commands
        .run(cmd, {
          background: true,
          onStdout: (data: string) => {
            console.log(`[Sandbox] ${conversationId} [vite]`, data);
            if (data.includes('Local:') || data.includes('localhost:')) {
              clearTimeout(timeout);
              resolve();
            }
          },
        } as { background?: boolean; onStdout?: (data: string) => void })
        .then((result: unknown) => {
          const handle = result as { kill?: () => Promise<unknown> };
          if (handle?.kill) this.devProcessMap.set(conversationId, { kill: handle.kill });
        })
        .catch((e) => {
          clearTimeout(timeout);
          reject(e);
        });
    });

    await viteReady;
    const host = sandbox.getHost(port);
    if (!host) throw new Error(`getHost(${port}) returned empty`);
    const url = `https://${host}`;
    console.log(`[Sandbox] ${conversationId} startDevServer: ready, url=`, url);
    return url;
  }

  /**
   * 读取沙箱内文件（供 ToolsService 等使用）
   */
  async readFile(conversationId: string, filePath: string): Promise<string> {
    const sandbox = this.sandboxMap.get(conversationId);
    if (!sandbox) throw new Error(`Sandbox not found: ${conversationId}`);
    return sandbox.files.read(filePath);
  }

  /**
   * 写入沙箱内单文件
   */
  async writeFile(conversationId: string, filePath: string, content: string): Promise<void> {
    const sandbox = this.sandboxMap.get(conversationId);
    if (!sandbox) throw new Error(`Sandbox not found: ${conversationId}`);
    await sandbox.files.write(filePath, content);
  }

  /**
   * 在沙箱内执行命令并返回结果（供 ToolsService 使用）
   */
  async runCommandForTool(
    conversationId: string,
    command: string,
    cwd?: string
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const fullCommand = cwd ? `cd ${cwd} && ${command}` : command;
    return this.runCommand(conversationId, fullCommand);
  }

  /**
   * 列出沙箱内目录（通过运行 ls）
   */
  async listDirectory(
    conversationId: string,
    dirPath: string
  ): Promise<{ dirs: string[]; files: string[] }> {
    const { stdout } = await this.runCommand(
      conversationId,
      `cd "${dirPath}" && for f in * .*; do [ "$f" != "." ] && [ "$f" != ".." ] && [ -e "$f" ] && if [ -d "$f" ]; then echo "d:$f"; else echo "f:$f"; fi; done`
    );
    const dirs: string[] = [];
    const files: string[] = [];
    for (const line of (stdout ?? '').trim().split('\n').filter(Boolean)) {
      const match = /^([df]):(.+)$/.exec(line);
      if (match) {
        if (match[1] === 'd') dirs.push(match[2] + '/');
        else files.push(match[2]);
      }
    }
    return { dirs, files };
  }
}
