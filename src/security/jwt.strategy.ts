import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from 'src/modules/user/user.repository';
import { AuthKeyConfig, AuthKeyConfigName } from 'src/config/authkey.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersRepo: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<AuthKeyConfig>(AuthKeyConfigName).jwtSecret,
    });
  }

  async validate(payload: any) {
    try {
      // Use 'sub' field as per JWT standard (subject = user ID)
      const user = await this.usersRepo.getUserById(payload.sub);

      if (!user) throw new UnauthorizedException('UNAUTHORIZED');

      // For password reset tokens, skip isActive check (user might be resetting password)
      // But include purpose from payload for PasswordResetGuard validation
      if (payload.purpose === 'password_reset') {
        return {
          ...user,
          purpose: payload.purpose,
        };
      }

      // For regular auth tokens, check if user is active
      if (!user.isActive) throw new UnauthorizedException('PLEASE_VERIFY_YOUR_EMAIL');

      // Include purpose if present (for future use)
      return {
        ...user,
        purpose: payload.purpose,
      };
    } catch (error) {
      throw new UnauthorizedException('UNAUTHORIZED');
    }
  }
}
