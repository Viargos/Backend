import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import helmet from 'helmet';
import * as compression from 'compression';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Response } from 'express';
import { ServerConfigName } from './config/server.config';
import { ConfigService } from '@nestjs/config';
import { ServerConfig } from './config/server.config';

async function bootstrap() {
  console.log('Jay Swaminarayan... Shree Swaminarayan Vijayate...');
  console.log('Shree Ganeshaya Namah... Ganpati Bappa Moriya...');

  // Create an Express-based NestJS app
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(),
  );
  const configService = app.get(ConfigService);
  const serverConfig = configService.getOrThrow<ServerConfig>(ServerConfigName);

  app.enableCors({
    origin: '*', // Default to '*' if no CORS origin specified
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
    exposedHeaders: 'access-token', // Expose the Authorization header
  });

  // Register helmet for security headers
  app.use(helmet());

  app.use(compression());

  app.setGlobalPrefix('api');

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Doctor-Patient API')
    .setDescription('API documentation for Doctor-Patient system')
    .addBearerAuth()
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);
  app.getHttpAdapter().get('/swagger.json', (_, res: Response) => {
    res.json(document);
  });
  await app.listen(serverConfig.port ?? 3000);
}
bootstrap();
