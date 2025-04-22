import { Injectable, Logger } from '@nestjs/common';
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DatabaseConfig, DatabaseConfigName } from '../config/database.config';
import { ServerConfig, ServerConfigName } from '../config/server.config';

@Injectable()
export class DatabaseFactory implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const dbConfig =
      this.configService.getOrThrow<DatabaseConfig>(DatabaseConfigName);

    const { user, host, port, name } = dbConfig;
    const password = encodeURIComponent(dbConfig.password);

    const serverConfig =
      this.configService.getOrThrow<ServerConfig>(ServerConfigName);

    const isDevelopment = serverConfig.nodeEnv === 'development';

    const uri = `postgres://${user}:${password}@${host}:${port}/${name}`;

    Logger.debug(`Database URI: ${uri}`);

    return {
      type: 'postgres',
      url: uri,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: isDevelopment, // Auto-sync DB in development (use migrations in production)
      logging: isDevelopment, // Enable query logging in development mode
      extra: {
        connectionTimeoutMillis: 60000, // 60s timeout for initial connection
        idleTimeoutMillis: 45000, // 45s timeout for idle connections
      },
    };
  }
}
