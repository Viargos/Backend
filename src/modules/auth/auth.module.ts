import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from 'src/security/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { EmailService } from './email.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AuthExceptionFilter } from './filters/auth-exception.filter';
import { Reflector } from '@nestjs/core';
import cookieConfig from '../../config/cookie.config';

@Module({
  imports: [
    UserModule,
    PassportModule,
    TypeOrmModule.forFeature([User, RefreshToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '10d',
        },
      }),
      inject: [ConfigService],
    }),
    ConfigModule.forFeature(cookieConfig),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get('MAIL_HOST'),
          port: parseInt(configService.get('MAIL_PORT') || '587'),
          secure: configService.get('MAIL_SECURE') === 'true',
          auth: {
            user: configService.get('MAIL_USER'),
            pass: configService.get('MAIL_PASS'),
          },
          // Add timeout and connection settings for cloud environments
          connectionTimeout: 30000, // 30 seconds
          greetingTimeout: 30000,
          socketTimeout: 30000,
          pool: true,
          maxConnections: 5,
          maxMessages: 10,
          // Gmail specific settings
          tls: {
            rejectUnauthorized: false,
            minVersion: 'TLSv1.2',
          },
        },
        defaults: {
          from:
            configService.get('MAIL_FROM') ||
            configService.get('EMAIL_USER') ||
            configService.get('MAIL_USER'),
        },
        template: {
          dir: join(process.cwd(), 'src/templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailService,
    LocalStrategy,
    JwtStrategy, // Keep for backward compatibility (password reset, etc.)
    JwtAccessStrategy,
    JwtRefreshStrategy,
    JwtAuthGuard,
    JwtRefreshGuard,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AuthExceptionFilter,
    },
    Reflector,
    ConfigService,
  ],
  exports: [AuthService, EmailService, JwtAuthGuard, JwtRefreshGuard],
})
export class AuthModule {}
