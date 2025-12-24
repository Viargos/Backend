/**
 * Validation related constants
 */

export const VALIDATION = {
  // Username
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_]+$/,
    PATTERN_MESSAGE: 'Username can only contain letters, numbers, and underscores',
  },

  // Email
  EMAIL: {
    MAX_LENGTH: 255,
  },

  // Password
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 100,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
    PATTERN_MESSAGE:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  },

  // Phone number
  PHONE: {
    PATTERN: /^\+?[1-9]\d{1,14}$/,
    PATTERN_MESSAGE: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)',
  },

  // Post
  POST: {
    DESCRIPTION_MIN_LENGTH: 1,
    DESCRIPTION_MAX_LENGTH: 5000,
  },

  // Comment
  COMMENT: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 1000,
  },

  // User bio
  BIO: {
    MAX_LENGTH: 500,
  },

  // Journey
  JOURNEY: {
    TITLE_MIN_LENGTH: 3,
    TITLE_MAX_LENGTH: 200,
    DESCRIPTION_MAX_LENGTH: 2000,
  },

  // Location
  LOCATION: {
    NAME_MAX_LENGTH: 255,
    LATITUDE_MIN: -90,
    LATITUDE_MAX: 90,
    LONGITUDE_MIN: -180,
    LONGITUDE_MAX: 180,
  },

  // OTP
  OTP: {
    LENGTH: 6,
    PATTERN: /^\d{6}$/,
  },
} as const;
