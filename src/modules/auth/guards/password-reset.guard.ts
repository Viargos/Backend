import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ERROR_MESSAGES } from 'src/common/constants';

// Local constant to avoid magic string and keep purpose semantics in one place
const PASSWORD_RESET_PURPOSE = 'password_reset' as const;

@Injectable()
export class PasswordResetGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_TOKEN);
    }

    // Ensure the token was explicitly issued for password reset
    if (user.purpose !== PASSWORD_RESET_PURPOSE) {
      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.PASSWORD_RESET_REQUIRED);
    }

    return user;
  }
}