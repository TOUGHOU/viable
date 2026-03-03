/**
 * @file prisma.config.ts
 * @description Prisma CLI 配置，数据源 URL 在此配置（Prisma 7+）
 * 使用 process.env + 占位 URL，保证无 .env 时 postinstall 的 prisma generate 也能执行
 */
import 'dotenv/config';

export default {
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DB_URL'] ?? 'postgresql://localhost:5432/vibe',
  },
};
