/**
 * @file: preview.module.ts
 * @author houfujian houfujian@jd.com
 * @description 沙箱能力模块，供 PreviewService 与 ToolsService 使用
 */
import { Module } from '@nestjs/common';
import { SandboxService } from '../llm/sandbox/sandbox.service';

@Module({
  providers: [SandboxService],
  exports: [SandboxService],
})
export class PreviewModule {}
