/**
 * @file prisma.service.ts
 * @author houfujian houfujian@jd.com
 * @description Prisma Client 单例，使用 SQLite adapter，供存储层注入
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const getDatabaseUrl = (): string => {
  const url = process.env['DB_URL'] ?? process.env['DATABASE_URL'] ?? 'file:./prisma/dev.db';
  return url;
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const url = getDatabaseUrl();
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
