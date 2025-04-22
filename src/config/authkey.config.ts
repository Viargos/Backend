import { registerAs } from '@nestjs/config';

export const AuthKeyConfigName = 'authkey';

export interface AuthKeyConfig {
  jwtSecret: string;
  expiresIn: string;
}

export default registerAs(AuthKeyConfigName, () => ({
  jwtSecret: process.env.JWT_SECRET,
  expiresIn: process.env.EXPIRES_IN,
}));
