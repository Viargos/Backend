import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class PasswordResetGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }

    // Check if token is for password reset
    if (user.purpose !== 'password_reset') {
      throw new UnauthorizedException('Invalid token purpose');
    }

    return user;
  }
} 