import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FastifyAdapter } from '@nestjs/platform-fastify';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new FastifyAdapter());
  console.log('Jay Swaminarayan... Shree Swaminarayan Vijayate...');
  console.log('Shree Ganeshaya Namah... Ganpati Bappa Moriya...');
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
