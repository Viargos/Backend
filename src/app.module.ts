import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import serverConfig from './config/server.config';
import databaseConfig from './config/database.config';
import tokenConfig from './config/token.config';
import cookieConfig from './config/cookie.config';
import { CoreModule } from './core/core.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseFactory } from './setup/database.factory';
import { SetupModule } from './setup/setup.module';
import { PostModule } from './modules/post/post.module';
import { JourneyModule } from './modules/journey/journey.module';
import { ChatModule } from './modules/chat/chat.module';
import { LocationModule } from './modules/location/location.module';
import authkeyConfig from './config/authkey.config';
import notificationConfig from './config/notification.config';
import { NotificationModule } from './modules/notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [
        serverConfig,
        databaseConfig,
        tokenConfig,
        authkeyConfig,
        cookieConfig,
        notificationConfig,
      ],
      cache: true,
      envFilePath: getEnvFilePath(),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: DatabaseFactory,
    }),
    CoreModule,
    UserModule,
    AuthModule,
    PostModule,
    JourneyModule,
    ChatModule,
    LocationModule,
    NotificationModule,
    SetupModule,
  ],
})
export class AppModule {}

function getEnvFilePath() {
  return process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
}
