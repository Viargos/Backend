import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from 'src/modules/user/user.repository';
import { ERROR_MESSAGES } from 'src/common/constants';

// Narrowed payload type to the fields this strategy actually depends on
interface JwtPayload {
  sub: string;
  purpose?: string;
  [key: string]: unknown;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersRepo: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
