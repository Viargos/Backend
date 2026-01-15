import { Injectable, Logger } from '@nestjs/common';
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DatabaseConfig, DatabaseConfigName } from '../config/database.config';
import { ServerConfig, ServerConfigName } from '../config/server.config';

@Injectable()
export class DatabaseFactory implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const serverConfig =
      this.configService.getOrThrow<ServerConfig>(ServerConfigName);

    const isDevelopment = serverConfig.nodeEnv === 'development';

    Logger.debug(`Configuring database connection for Neon`);
    const dbHost: string = process.env.DB_HOST;
    const dbPort: number = Number(process.env.DB_PORT);
    const dbUsername: string = process.env.DB_USER;
    const dbPassword: string = process.env.DB_PWD;
    const db: string = process.env.DB_NAME;
    return {
      type: 'postgres',
      host: dbHost,
      port: dbPort,
      username: dbUsername,
      password: dbPassword,
      database: db,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: isDevelopment, // Auto-create tables in development only
      logging: isDevelopment,
      ssl: {
        rejectUnauthorized: false,
      },
      extra: {
        max: 5, // Reduce connection pool size
        min: 1,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 20000,
      },
    };
  }
}
