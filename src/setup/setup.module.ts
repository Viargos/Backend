import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatGateway } from './chat.gateway';
import { ChatModule } from '../modules/chat/chat.module';
import { AuthKeyConfig, AuthKeyConfigName } from '../config/authkey.config';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<AuthKeyConfig>(AuthKeyConfigName).jwtSecret,
      }),
      inject: [ConfigService],
    }),
    ChatModule,
  ],
  providers: [ChatGateway],
})
export class SetupModule {} 