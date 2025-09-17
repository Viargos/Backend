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

    return {
      type: 'postgres',
      host: 'ep-damp-sky-aerflkll-pooler.c-2.us-east-2.aws.neon.tech',
      port: 5432,
      username: 'neondb_owner',
      password: 'npg_u9Zy3taNKkYP',
      database: 'neondb',
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: false,
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
