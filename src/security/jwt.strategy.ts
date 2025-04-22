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
      const user = await this.usersRepo.getUserById(payload.id);

      if (!user) throw new UnauthorizedException('UNAUTHORIZED');

      return user;
    } catch (error) {
      throw new UnauthorizedException('UNAUTHORIZED');
    }
  }
}
