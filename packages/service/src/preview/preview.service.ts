/**
 * @file: preview.service.ts
 * @author houfujian houfujian@jd.com
 * @description 对话预览：从模板读取内容、写入 E2B 沙箱、安装依赖、启动 dev server，获取预览链接并更新会话状态
 */

import { Inject, Injectable } from '@nestjs/common';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import type { IProjectStorage } from '../chat/storage/chat-storage.interface';
import { readDirectoryFilesRecursive } from '../utils/file';
import { SandboxService, SANDBOX_APP_PATH, type FileEntry } from '../llm/sandbox/sandbox.service';

/** 从 dist/preview 到 monorepo 根目录的上级层数 */
const REPO_ROOT_UP_LEVELS = 5;
const DEFAULT_TEMPLATE_DIR = 'app-template';
const PREVIEW_MODE = process.env.VIBE_PREVIEW_MODE ?? 'e2b';
const LOCAL_PREVIEW_DIR_ROOT_DEFAULT = path.resolve(process.cwd(), 'data/preview');
const LOCAL_PREVIEW_DIR_ROOT =
  process.env.VIBE_LOCAL_PREVIEW_ROOT ?? LOCAL_PREVIEW_DIR_ROOT_DEFAULT;
const DEFAULT_LOCAL_DEV_PORT = 9999;
const LOCAL_DEV_SERVER_READY_TIMEOUT_MS = 120_000;

@Injectable()
export class PreviewService {
  private readonly templatePath: string;
  private localDevProcess: {
    projectId: string;
    proc: ReturnType<typeof spawn>;
  } | null = null;

  constructor(
    @Inject('IProjectStorage') private readonly storage: IProjectStorage,
    private readonly sandboxService: SandboxService
  ) {
    const repoRoot = path.resolve(__dirname, ...Array(REPO_ROOT_UP_LEVELS).fill('..'));
    this.templatePath =
      process.env.PREVIEW_TEMPLATE_PATH ?? path.join(repoRoot, DEFAULT_TEMPLATE_DIR);
  }

  /**
   * 获取某项目的预览工作区路径（沙箱内路径），供 coding agent 工具使用；若需标识为 E2B 工作区，可返回 e2b://projectId
   */
  getPreviewDir(projectId: string): string {
    return `e2b://${projectId}`;
  }

  /**
   * 创建项目后调用：读模板、写沙箱、安装、启动，完成后更新项目的 previewUrl / previewStatus
   */
  setupPreview(projectId: string): void {
    this.runSetup(projectId).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      const extra =
        err &&
        typeof err === 'object' &&
        (err as Error & { stdout?: string; stderr?: string; exitCode?: number });
      this.storage.updateProject(projectId, { previewStatus: 'failed' }).catch(() => {});
      console.error(`[Preview] setup failed for ${projectId}:`, message);
      if (extra?.stdout) console.error(`[Preview] stdout:`, extra.stdout);
      if (extra?.stderr) console.error(`[Preview] stderr:`, extra.stderr);
      if (extra?.exitCode != null) console.error(`[Preview] exitCode:`, extra.exitCode);
      if (err instanceof Error && err.stack) console.error(`[Preview] stack:`, err.stack);
    });
  }

  /**
   * 删除项目时调用：关闭沙箱并清除项目中记录的 sandboxId（避免下次误连已关闭的沙箱）
   */
  async stopPreview(projectId: string): Promise<void> {
    if (PREVIEW_MODE === 'local-debug') {
      await this.stopLocalDevServerIfNeeded(projectId);
      await this.storage
        .updateProject(projectId, { previewUrl: null, previewStatus: 'failed' })
        .catch(() => {});
      return;
    }

    await this.sandboxService.closeSandbox(projectId);
    await this.storage.updateProject(projectId, { sandboxId: undefined }).catch(() => {});
  }

  private async runSetup(projectId: string): Promise<void> {
    if (PREVIEW_MODE === 'local-debug') {
      await this.runLocalSetup(projectId);
      return;
    }

    await this.runE2bSetup(projectId);
  }

  private getLocalProjectDir(projectId: string): string {
    return path.join(LOCAL_PREVIEW_DIR_ROOT, projectId);
  }

  private async ensureLocalProjectDir(projectId: string): Promise<string> {
    const dir = this.getLocalProjectDir(projectId);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  private async writeLocalFiles(projectDir: string, files: FileEntry[]): Promise<void> {
    // 写入 template 到本地项目目录
    for (const f of files) {
      const targetPath = path.join(projectDir, f.relativePath);
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, f.data, 'utf-8');
    }
  }

  private async runLocalCommand(
    cwd: string,
    command: string
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, { cwd, shell: true, env: process.env });
      let stdout = '';
      let stderr = '';

      const timeout = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error(`Local command timeout: ${command}`));
      }, 15 * 60_000);

      proc.stdout?.on('data', (d) => {
        stdout += String(d);
      });
      proc.stderr?.on('data', (d) => {
        stderr += String(d);
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      proc.on('close', (code) => {
        clearTimeout(timeout);
        resolve({
          exitCode: code ?? -1,
          stdout,
          stderr,
        });
      });
    });
  }

  private async startLocalDevServerAndGetPreviewUrl(
    projectId: string,
    projectDir: string,
    port: number
  ): Promise<string> {
    // A：只允许一个本地预览进程；新建前先停旧
    await this.stopLocalDevServerIfNeeded();

    const cmd = 'npm';
    const args = ['run', 'dev', '--', '--port', String(port), '--strictPort'];
    const proc = spawn(cmd, args, { cwd: projectDir, env: process.env });

    this.localDevProcess = {
      projectId,
      proc,
    };

    let ready = false;
    const readyUrl = `http://localhost:${port}`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (ready) return;
        reject(
          new Error(`Local Vite not ready within ${LOCAL_DEV_SERVER_READY_TIMEOUT_MS / 1000}s`)
        );
      }, LOCAL_DEV_SERVER_READY_TIMEOUT_MS);

      const onExit = (code: number | null) => {
        clearTimeout(timeout);
        if (!ready) {
          reject(new Error(`Local dev server exited early (code=${code})`));
        }
      };

      proc.on('exit', onExit);

      proc.stdout?.on('data', (d) => {
        const s = String(d);
        // Vite 默认会输出类似：
        // Local:   http://localhost:5174/
        // Network: ...
        if (s.includes('Local:') && !ready) {
          ready = true;
          clearTimeout(timeout);
          resolve(readyUrl);
        }
      });

      proc.stderr?.on('data', () => {
        // 有些依赖警告会进 stderr；不直接 reject，等待 Local:
      });
    });
  }

  private async stopLocalDevServerIfNeeded(projectId?: string): Promise<void> {
    const current = this.localDevProcess;
    if (!current) return;
    if (projectId && current.projectId !== projectId) return;

    const proc = current.proc;
    this.localDevProcess = null;
    try {
      proc.kill('SIGTERM');
    } catch {
      // ignore
    }
  }

  private async runLocalSetup(projectId: string): Promise<void> {
    const log = (msg: string, ...args: unknown[]) =>
      console.log(`[Preview] ${projectId} ${msg}`, ...args);

    log('runLocalSetup start, templatePath:', this.templatePath);

    const projectDir = await this.ensureLocalProjectDir(projectId);

    // 仅在目录为空时写入模板；避免覆盖 LLM 已修改的代码
    let shouldInitFromTemplate = true;
    try {
      const files = await fs.readdir(projectDir);
      shouldInitFromTemplate = files.length === 0;
    } catch {
      shouldInitFromTemplate = true;
    }

    if (shouldInitFromTemplate) {
      const files: FileEntry[] = readDirectoryFilesRecursive(this.templatePath);
      log('readDirectoryFilesRecursive done, file count:', files.length);
      if (files.length === 0) {
        throw new Error(`Template is empty or not found: ${this.templatePath}`);
      }

      await this.writeLocalFiles(projectDir, files);
      log('writeLocalFiles done');
    }

    // 安装依赖（每次本地预览启动都做一次，便于 debug 一致性）
    log('run local npm install');
    const install = await this.runLocalCommand(projectDir, 'npm install');
    if (install.exitCode !== 0) {
      throw new Error(`npm install failed: ${install.stderr || install.stdout}`);
    }

    log('startLocalDevServerAndGetPreviewUrl');
    const previewUrl = await this.startLocalDevServerAndGetPreviewUrl(
      projectId,
      projectDir,
      DEFAULT_LOCAL_DEV_PORT
    );
    log('local dev server started, previewUrl:', previewUrl);

    await this.storage.updateProject(projectId, {
      previewPort: DEFAULT_LOCAL_DEV_PORT,
      previewUrl,
      previewStatus: 'running',
      sandboxId: null,
    });
    log('runLocalSetup success');
  }

  private async runE2bSetup(projectId: string): Promise<void> {
    const log = (msg: string, ...args: unknown[]) =>
      console.log(`[Preview] ${projectId} ${msg}`, ...args);

    log('runSetup start, templatePath:', this.templatePath);

    const project = await this.storage.getProject(projectId);
    const existingSandboxId = project?.sandboxId;

    const { sandboxId, recreated } = await this.sandboxService.ensureSandbox(
      projectId,
      existingSandboxId ?? undefined
    );
    if (recreated && sandboxId) {
      await this.storage.updateProject(projectId, { sandboxId });
    }
    log('ensureSandbox done, sandboxId=', sandboxId, 'recreated=', recreated);

    const files: FileEntry[] = readDirectoryFilesRecursive(this.templatePath);
    log('readDirectoryFilesRecursive done, file count:', files.length);
    if (files.length === 0) {
      throw new Error(`Template is empty or not found: ${this.templatePath}`);
    }

    await this.sandboxService.writeFiles(projectId, SANDBOX_APP_PATH, files);
    log('writeFiles done');

    await this.sandboxService.installDependencies(projectId, SANDBOX_APP_PATH);
    log('installDependencies done');

    const previewUrl = await this.sandboxService.startDevServerAndGetPreviewUrl(
      projectId,
      SANDBOX_APP_PATH
    );
    log('startDevServerAndGetPreviewUrl done, previewUrl:', previewUrl);

    await this.storage.updateProject(projectId, {
      previewUrl,
      previewStatus: 'running',
    });
    log('runSetup success');
  }
}
