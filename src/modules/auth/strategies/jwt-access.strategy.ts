import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '../../user/user.repository';
import { TokenConfig, TokenConfigName } from '../../../config/token.config';
import { COOKIE_NAMES } from '../../../common/constants';
import { ERROR_MESSAGES } from '../../../common/constants';

/**
 * Custom cookie extractor for access token
 */
const cookieExtractor = (req: Request): string | null => {
  if (req && req.cookies) {
    return req.cookies[COOKIE_NAMES.ACCESS_TOKEN] || null;
  }
  return null;
};

interface JwtAccessPayload {
  sub: string;
  email: string;
  emailVerified?: boolean;
  username: string;
  [key: string]: unknown;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersRepo: UserRepository,
  ) {
    const tokenConfig = configService.getOrThrow<TokenConfig>(TokenConfigName);
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: tokenConfig.jwtAccessSecret,
    });
  }

  async validate(payload: JwtAccessPayload) {
    try {
      if (payload.emailVerified === false) {
        throw new UnauthorizedException('EMAIL_VERIFICATION_REQUIRED');
      }

      const user = await this.usersRepo.getUserById(payload.sub);

      if (!user) {
        throw new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED);
      }

      // Check if user is active
      if (!user.isActive) {
        throw new UnauthorizedException('EMAIL_VERIFICATION_REQUIRED');
      }

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED);
    }
  }
}
