import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { AuthKeyConfig, AuthKeyConfigName } from 'src/config/authkey.config';

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private readTokenFromCookieHeader(cookieHeader?: string): string | null {
    if (!cookieHeader) {
      return null;
    }

    const tokenPair = cookieHeader
      .split(';')
      .map(item => item.trim())
      .find(item => item.startsWith('viargos_access_token='));

    if (!tokenPair) {
      return null;
    }

    const value = tokenPair.slice('viargos_access_token='.length);
    return value ? decodeURIComponent(value) : null;
  }

  private getSocketToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const headerValue = Array.isArray(client.handshake.headers.cookie)
      ? client.handshake.headers.cookie.join(';')
      : client.handshake.headers.cookie;

    return this.readTokenFromCookieHeader(headerValue);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.getSocketToken(client);

      if (!token) {
        throw new WsException('Authentication token not found');
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<AuthKeyConfig>(AuthKeyConfigName).jwtSecret,
      });

      // Attach user to socket
      client.data.user = payload;
      return true;
    } catch (error) {
      throw new WsException('Invalid authentication token');
    }
  }
} 
