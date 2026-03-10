/**
 * @file: preview.service.ts
 * @author houfujian houfujian@jd.com
 * @description 对话预览：从模板读取内容、写入 E2B 沙箱、安装依赖、启动 dev server，获取预览链接并更新会话状态
 */

import { Inject, Injectable } from '@nestjs/common';
import * as path from 'node:path';
import type { IChatStorage } from '../chat/storage/chat-storage.interface';
import { readDirectoryFilesRecursive } from '../utils/file';
import { SandboxService, SANDBOX_APP_PATH, type FileEntry } from './sandbox.service';

/** 从 dist/preview 到 monorepo 根目录的上级层数 */
const REPO_ROOT_UP_LEVELS = 5;
const DEFAULT_TEMPLATE_DIR = 'app-template';

@Injectable()
export class PreviewService {
  private readonly templatePath: string;

  constructor(
    @Inject('IChatStorage') private readonly storage: IChatStorage,
    private readonly sandboxService: SandboxService
  ) {
    const repoRoot = path.resolve(__dirname, ...Array(REPO_ROOT_UP_LEVELS).fill('..'));
    this.templatePath =
      process.env.PREVIEW_TEMPLATE_PATH ?? path.join(repoRoot, DEFAULT_TEMPLATE_DIR);
  }

  /**
   * 获取某会话的预览工作区路径（沙箱内路径），供 coding agent 工具使用；若需标识为 E2B 工作区，可返回 e2b://conversationId
   */
  getPreviewDir(conversationId: string): string {
    return `e2b://${conversationId}`;
  }

  /**
   * 创建对话后调用：读模板、写沙箱、安装、启动，完成后更新会话的 previewUrl / previewStatus
   */
  setupPreview(conversationId: string): void {
    this.runSetup(conversationId).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      const extra =
        err &&
        typeof err === 'object' &&
        (err as Error & { stdout?: string; stderr?: string; exitCode?: number });
      this.storage.updateConversation(conversationId, { previewStatus: 'failed' }).catch(() => {});
      console.error(`[Preview] setup failed for ${conversationId}:`, message);
      if (extra?.stdout) console.error(`[Preview] stdout:`, extra.stdout);
      if (extra?.stderr) console.error(`[Preview] stderr:`, extra.stderr);
      if (extra?.exitCode != null) console.error(`[Preview] exitCode:`, extra.exitCode);
      if (err instanceof Error && err.stack) console.error(`[Preview] stack:`, err.stack);
    });
  }

  /**
   * 删除对话时调用：关闭沙箱
   */
  async stopPreview(conversationId: string): Promise<void> {
    await this.sandboxService.closeSandbox(conversationId);
  }

  private async runSetup(conversationId: string): Promise<void> {
    const log = (msg: string, ...args: unknown[]) =>
      console.log(`[Preview] ${conversationId} ${msg}`, ...args);

    log('runSetup start, templatePath:', this.templatePath);

    const files: FileEntry[] = readDirectoryFilesRecursive(this.templatePath);
    log('readDirectoryFilesRecursive done, file count:', files.length);
    if (files.length === 0) {
      throw new Error(`Template is empty or not found: ${this.templatePath}`);
    }

    await this.sandboxService.createSandbox(conversationId);
    log('createSandbox done');

    await this.sandboxService.writeFiles(conversationId, SANDBOX_APP_PATH, files);
    log('writeFiles done');

    await this.sandboxService.installDependencies(conversationId, SANDBOX_APP_PATH);
    log('installDependencies done');

    const previewUrl = await this.sandboxService.startDevServerAndGetPreviewUrl(
      conversationId,
      SANDBOX_APP_PATH
    );
    log('startDevServerAndGetPreviewUrl done, previewUrl:', previewUrl);

    await this.storage.updateConversation(conversationId, {
      previewUrl,
      previewStatus: 'running',
    });
    log('runSetup success');
  }
}
