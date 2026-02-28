import { registerAs } from '@nestjs/config';
import { CookieOptions } from 'express';

export const CookieConfigName = 'cookie';

export interface CookieConfig {
  domain: string | undefined;
  frontendUrl: string;
}

export default registerAs(CookieConfigName, () => ({
  domain: normalizeCookieDomain(process.env.COOKIE_DOMAIN),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
}));

function normalizeCookieDomain(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (normalized === 'localhost' || normalized === '127.0.0.1') {
    return undefined;
  }

  return value;
}

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
