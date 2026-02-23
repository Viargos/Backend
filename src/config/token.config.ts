import { registerAs } from '@nestjs/config';

export const TokenConfigName = 'token';

export interface TokenConfig {
  accessTokenValidity: number;
  refreshTokenValidity: number;
  issuer: string;
  audience: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessExpiration: string;
  jwtRefreshExpiration: string;
}

function parseSeconds(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? '', 10);
  if (!value || isNaN(parsed) || String(parsed) !== value.trim()) {
    console.warn(
      `[TokenConfig] Invalid seconds value "${value}" – must be a plain integer (e.g. 864000). Falling back to ${fallback}.`,
    );
    return fallback;
  }
  return parsed;
}

export default registerAs(TokenConfigName, () => ({
  accessTokenValidity: parseSeconds(process.env.ACCESS_TOKEN_VALIDITY_SEC, 3600),
  refreshTokenValidity: parseSeconds(process.env.REFRESH_TOKEN_VALIDITY_SEC, 604800),
  issuer: process.env.TOKEN_ISSUER || 'viargos-api',
  audience: process.env.TOKEN_AUDIENCE || 'viargos-users',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || '',
  jwtAccessExpiration: process.env.JWT_ACCESS_EXPIRATION || '1h', // 1 hour default (changed from 15m)
  jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
}));
