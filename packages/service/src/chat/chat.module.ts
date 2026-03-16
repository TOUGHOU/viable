/**
 * @file: chat.module.ts
 * @author houfujian houfujian@jd.com
 */
import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatPrismaStorage } from './storage/chat.prisma.storage';
import { PrismaService } from '../prisma/prisma.service';
import { LlmModule } from '../llm/llm.module';
import { PreviewModule } from '../preview/preview.module';
import { PreviewService } from '../preview/preview.service';

@Module({
  imports: [LlmModule, PreviewModule],
  controllers: [ChatController],
  providers: [
    PrismaService,
    PreviewService,
    ChatService,
    {
      provide: 'IProjectStorage',
      useClass: ChatPrismaStorage,
    },
  ],
})
export class ChatModule {}
