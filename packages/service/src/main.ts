/**
 * @file: main.ts
 * @author: houfujian houfujian@jd.com
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Service running at http://localhost:${port}`);
}

bootstrap();
