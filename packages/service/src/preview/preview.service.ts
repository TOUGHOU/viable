/**
 * @file: preview.service.ts
 * @author houfujian houfujian@jd.com
 * @description 对话预览：复制模板、安装依赖、启动 dev server，端口分配与进程管理；完成后通过存储层更新会话的预览状态，不依赖 ChatService
 */

import { Inject, Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn, type ChildProcess } from 'child_process';
import * as net from 'net';
import type { IChatStorage } from '../chat/storage/chat-storage.interface';

const DEFAULT_PORT_START = 3001;
const DEFAULT_PORT_END = 3199;
const SKIP_DIRS = new Set(['node_modules', '.git', '.vite', 'dist', '.turbo']);

@Injectable()
export class PreviewService {
  private readonly previewRoot: string;
  private readonly templatePath: string;
  private readonly portStart: number;
  private readonly portEnd: number;
  private readonly processMap = new Map<string, ChildProcess>();

  constructor(@Inject('IChatStorage') private readonly storage: IChatStorage) {
    this.previewRoot = process.env.PREVIEW_ROOT ?? path.resolve(process.cwd(), 'data', 'preview');
    this.templatePath =
      process.env.PREVIEW_TEMPLATE_PATH ?? path.resolve(process.cwd(), '..', 'app-template');
    this.portStart = parseInt(process.env.PREVIEW_PORT_START ?? String(DEFAULT_PORT_START), 10);
    this.portEnd = parseInt(process.env.PREVIEW_PORT_END ?? String(DEFAULT_PORT_END), 10);
  }

  /**
   * 获取某会话的预览目录绝对路径，供 coding agent 工具的工作区使用
   */
  getPreviewDir(conversationId: string): string {
    return path.join(this.previewRoot, conversationId);
  }

  /**
   * 创建对话后调用：复制模板并异步安装、启动，完成后更新会话的 previewPort / previewUrl / previewStatus
   */
  setupPreview(conversationId: string): void {
    this.runSetup(conversationId).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      this.storage.updateConversation(conversationId, { previewStatus: 'failed' }).catch(() => {});
      console.error(`[Preview] setup failed for ${conversationId}:`, message);
    });
  }

  /**
   * 删除对话时调用：结束预览进程并删除预览目录
   */
  async stopPreview(conversationId: string): Promise<void> {
    const proc = this.processMap.get(conversationId);
    if (proc?.pid) {
      this.processMap.delete(conversationId);
      try {
        process.kill(-proc.pid, 'SIGTERM');
      } catch {
        try {
          proc.kill('SIGTERM');
        } catch {
          // ignore
        }
      }
    }
    const dir = path.join(this.previewRoot, conversationId);
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }

  private async runSetup(conversationId: string): Promise<void> {
    const dir = path.join(this.previewRoot, conversationId);
    await fs.mkdir(path.dirname(dir), { recursive: true });
    await this.copyTemplate(this.templatePath, dir);
    const port = await this.getAvailablePort();
    await this.installDeps(dir);
    await this.startDev(dir, conversationId, port);
    const previewUrl = `http://localhost:${port}`;
    await this.storage.updateConversation(conversationId, {
      previewPort: port,
      previewUrl,
      previewStatus: 'running',
    });
  }

  private async copyTemplate(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        await this.copyTemplate(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  private getAvailablePort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const tryPort = (port: number) => {
        if (port > this.portEnd) {
          reject(new Error(`No available port in range ${this.portStart}-${this.portEnd}`));
          return;
        }
        const server = net.createServer();
        server.once('error', () => tryPort(port + 1));
        server.once('listening', () => {
          server.close(() => resolve(port));
        });
        server.listen(port, '127.0.0.1');
      };
      tryPort(this.portStart);
    });
  }

  private installDeps(dir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const isWin = process.platform === 'win32';
      const child = spawn('npm', ['install'], {
        cwd: dir,
        stdio: 'inherit',
        shell: isWin,
      });
      child.on('error', reject);
      child.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`npm install exited with code ${code}`));
      });
    });
  }

  private startDev(dir: string, conversationId: string, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const isWin = process.platform === 'win32';
      const child = spawn(isWin ? 'npm.cmd' : 'npm', ['run', 'dev', '--', '--port', String(port)], {
        cwd: dir,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: isWin,
        detached: !isWin,
      });
      this.processMap.set(conversationId, child);
      let resolved = false;
      const done = (err?: Error) => {
        if (resolved) return;
        resolved = true;
        if (err) {
          this.processMap.delete(conversationId);
          try {
            child.kill('SIGTERM');
          } catch {
            // ignore
          }
          reject(err);
        } else {
          resolve();
        }
      };
      const timeout = setTimeout(() => {
        if (!resolved) done();
      }, 8000);
      child.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        if (text.includes('Local:') || text.includes('localhost:')) {
          clearTimeout(timeout);
          done();
        }
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        if (text.includes('Local:') || text.includes('localhost:')) {
          clearTimeout(timeout);
          done();
        }
      });
      child.on('error', (err) => done(err));
      child.on('exit', (code, signal) => {
        if (!resolved && code !== 0 && code !== null) {
          done(new Error(`vite exited with code ${code} signal ${signal}`));
        }
      });
    });
  }
}
