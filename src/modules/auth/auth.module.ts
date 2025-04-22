import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { UserRepository } from '../user/user.repository';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthKeyConfig, AuthKeyConfigName } from 'src/config/authkey.config';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from 'src/security/local.strategy';
import { JwtStrategy } from 'src/security/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'local' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const authConfig = configService.get<AuthKeyConfig>(AuthKeyConfigName);
        return {
          secret: authConfig.jwtSecret,
          signOptions: {
            expiresIn: configService.get(
              'JWT_EXPIRES_IN',
              authConfig.expiresIn,
            ),
          },
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserRepository,
    LocalStrategy,
    ConfigService,
    JwtStrategy,
  ],
})
export class AuthModule {}
