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
 * Custom cookie extractor for refresh token
 */
const cookieExtractor = (req: Request): string | null => {
  if (req && req.cookies) {
    return req.cookies[COOKIE_NAMES.REFRESH_TOKEN] || null;
  }
  return null;
};

interface JwtRefreshPayload {
  sub: string;
  tokenId: string;
  [key: string]: unknown;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersRepo: UserRepository,
  ) {
    const tokenConfig = configService.getOrThrow<TokenConfig>(TokenConfigName);
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: tokenConfig.jwtRefreshSecret,
    });
  }

  async validate(payload: JwtRefreshPayload) {
    try {
      const user = await this.usersRepo.getUserById(payload.sub);

      if (!user) {
        throw new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED);
      }

      // Check if user is active
      if (!user.isActive) {
        throw new UnauthorizedException(ERROR_MESSAGES.AUTH.ACCOUNT_NOT_ACTIVE);
      }

      // Return user with tokenId for refresh token lookup
      return {
        ...user,
        tokenId: payload.tokenId,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED);
    }
  }
}
