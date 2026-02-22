import { Response } from 'express';
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getClearCookieOptions,
} from '../../../config/cookie.config';
import { COOKIE_NAMES } from '../../../common/constants';
import { ConfigService } from '@nestjs/config';
import { CookieConfig, CookieConfigName } from '../../../config/cookie.config';
import { TokenConfig, TokenConfigName } from '../../../config/token.config';

/**
 * Set both access and refresh token cookies
 */
export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  configService: ConfigService,
): void {
  const cookieConfig = configService.getOrThrow<CookieConfig>(CookieConfigName);
  const tokenConfig = configService.getOrThrow<TokenConfig>(TokenConfigName);

  const accessOptions = getAccessTokenCookieOptions(
    tokenConfig.accessTokenValidity,
    cookieConfig.domain,
  );
  const refreshOptions = getRefreshTokenCookieOptions(
    tokenConfig.refreshTokenValidity,
    cookieConfig.domain,
  );

  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, accessOptions);
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, refreshOptions);
}

/**
 * Set only access token cookie (used during refresh)
 */
export function setAccessCookie(
  res: Response,
  accessToken: string,
  configService: ConfigService,
): void {
  const cookieConfig = configService.getOrThrow<CookieConfig>(CookieConfigName);
  const tokenConfig = configService.getOrThrow<TokenConfig>(TokenConfigName);

  const accessOptions = getAccessTokenCookieOptions(
    tokenConfig.accessTokenValidity,
    cookieConfig.domain,
  );

  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, accessOptions);
}

/**
 * Clear both authentication cookies
 */
export function clearAuthCookies(
  res: Response,
  configService: ConfigService,
): void {
  const cookieConfig = configService.getOrThrow<CookieConfig>(CookieConfigName);
  const clearOptions = getClearCookieOptions(cookieConfig.domain);

  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, clearOptions);
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, clearOptions);
}
