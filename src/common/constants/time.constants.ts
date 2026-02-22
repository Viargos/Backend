/**
 * Time-related constants (in seconds or milliseconds as noted)
 */

export const TIME = {
  // OTP expiry
  OTP_EXPIRY_MINUTES: 10,
  OTP_EXPIRY_SECONDS: 10 * 60, // 10 minutes

  // JWT token expiry
  JWT_ACCESS_TOKEN_EXPIRY: '1h', // 1 hour (for cookie-based auth)
  JWT_REFRESH_TOKEN_EXPIRY: '7d', // 7 days (for cookie-based auth)
  JWT_ACCESS_TOKEN_EXPIRY_SECONDS: 60 * 60, // 1 hour (3600 seconds)
  JWT_REFRESH_TOKEN_EXPIRY_SECONDS: 7 * 24 * 60 * 60, // 7 days

  // Password reset token expiry
  PASSWORD_RESET_TOKEN_EXPIRY: '15m', // 15 minutes
  PASSWORD_RESET_TOKEN_EXPIRY_SECONDS: 15 * 60, // 15 minutes

  // Cache TTL (in seconds)
  CACHE_TTL: {
    SHORT: 60, // 1 minute
    MEDIUM: 300, // 5 minutes
    LONG: 3600, // 1 hour
    USER_PROFILE: 300, // 5 minutes
    POST: 60, // 1 minute
    JOURNEY: 300, // 5 minutes
  },

  // Rate limiting windows (in milliseconds)
  RATE_LIMIT: {
    SHORT: 1000, // 1 second
    MEDIUM: 10000, // 10 seconds
    LONG: 60000, // 1 minute
    VERY_LONG: 300000, // 5 minutes
  },
} as const;
