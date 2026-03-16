/**
 * @file: main.ts
 * @author: houfujian houfujian@jd.com
 */
import { config } from 'dotenv';

// 先加载 .env，再加载 .env.local（存在则覆盖），保证本地开发能读到 .env.local
config();
config({ path: '.env.local', override: true });

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { traceMiddleware } from './common/middleware/trace.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;

  app.use(traceMiddleware);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });

  await app.listen(port);
  console.log(`Service running at http://localhost:${port}`);
}

bootstrap();
