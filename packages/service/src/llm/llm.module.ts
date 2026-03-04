/**
 * @file llm.module.ts
 * @author houfujian houfujian@jd.com
 */
import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';

@Module({
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
