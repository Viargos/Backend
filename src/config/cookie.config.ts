import { registerAs } from '@nestjs/config';
import { CookieOptions } from 'express';

export const CookieConfigName = 'cookie';

export interface CookieConfig {
  domain: string | undefined;
  frontendUrl: string;
}

export default registerAs(CookieConfigName, () => ({
  domain: process.env.COOKIE_DOMAIN || undefined,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
}));

/**
 * Get cookie options for access token
 */
export function getAccessTokenCookieOptions(
  maxAgeSeconds: number,
  domain?: string,
): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: 'lax', // CSRF protection
    domain: domain || undefined,
    path: '/',
    maxAge: maxAgeSeconds * 1000, // Convert to milliseconds
  };
}

/**
 * Get cookie options for refresh token
 */
export function getRefreshTokenCookieOptions(
  maxAgeSeconds: number,
  domain?: string,
): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: 'lax', // CSRF protection
    domain: domain || undefined,
    path: '/',
    maxAge: maxAgeSeconds * 1000, // Convert to milliseconds
  };
}

/**
 * Get cookie options for clearing cookies (must match original cookie options)
 */
export function getClearCookieOptions(domain?: string): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    domain: domain || undefined,
    path: '/',
    maxAge: 0, // Expire immediately
  };
}
