import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from 'src/modules/user/user.repository';
import { ERROR_MESSAGES, COOKIE_NAMES } from 'src/common/constants';

// Narrowed payload type to the fields this strategy actually depends on
interface JwtPayload {
  sub: string;
  purpose?: string;
  [key: string]: unknown;
}

/**
 * Custom cookie extractor for access token
 * Extracts JWT from cookies (for SSR requests from Next.js Server Components)
 */
const cookieExtractor = (req: Request): string | null => {
  if (req && req.cookies) {
    return req.cookies[COOKIE_NAMES.ACCESS_TOKEN] || null;
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersRepo: UserRepository,
  ) {
    super({
      // Extract JWT from BOTH cookies (for SSR) AND Authorization header (for API clients)
      // Tries cookies first, then falls back to Bearer token
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Use 'sub' field as per JWT standard (subject = user ID)
    const user = await this.usersRepo.getUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED);
    }

    // Include the purpose from the JWT payload so guards can validate it
    // This is essential for PasswordResetGuard to work correctly
    return {
      ...user,
      purpose: payload.purpose, // may be undefined; guards handle that case
    };
  }
}
