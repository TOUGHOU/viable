/**
 * @file: prisma.service.ts
 * @author houfujian houfujian@jd.com
 * @description Prisma Client 单例（SQLite），供存储层注入。Prisma 7 仅支持通过 adapter 传入连接。
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const url = process.env['DATABASE_URL'] ?? 'file:./prisma/dev.db';
    const adapter = new PrismaBetterSqlite3({ url });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
