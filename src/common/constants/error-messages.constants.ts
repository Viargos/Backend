/**
 * Standardized error messages
 */

export const ERROR_MESSAGES = {
  // Generic errors
  INTERNAL_SERVER_ERROR: 'Internal server error occurred',
  BAD_REQUEST: 'Bad request',
  VALIDATION_ERROR: 'Validation failed',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  CONFLICT: 'Resource already exists',

  // Authentication errors
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    ACCOUNT_NOT_ACTIVE: 'Please verify your email address',
    ACCOUNT_SUSPENDED: 'Your account has been suspended',
    SESSION_EXPIRED: 'Your session has expired. Please login again',
    INVALID_TOKEN: 'Invalid or expired token',
    TOKEN_REQUIRED: 'Authentication token is required',
    PASSWORD_RESET_REQUIRED: 'Password reset is required',
    TWO_FACTOR_REQUIRED: 'Two-factor authentication is required',
    SIGNUP_FAILED: 'Registration failed',
  },

  // User errors
  USER: {
    NOT_FOUND: 'User not found',
    EMAIL_ALREADY_EXISTS: 'Email address already registered',
    USERNAME_ALREADY_EXISTS: 'Username already taken',
    PHONE_ALREADY_EXISTS: 'Phone number already registered',
    CANNOT_FOLLOW_SELF: 'You cannot follow yourself',
    ALREADY_FOLLOWING: 'You are already following this user',
    NOT_FOLLOWING: 'You are not following this user',
    PROFILE_UPDATE_FAILED: 'Failed to update profile',
  },

  // OTP errors
  OTP: {
    INVALID: 'Invalid OTP code',
    EXPIRED: 'OTP has expired. Please request a new one',
    ALREADY_USED: 'This OTP has already been used',
    NOT_FOUND: 'No OTP found for this user',
    GENERATION_FAILED: 'Failed to generate OTP',
    SEND_FAILED: 'Failed to send OTP',
    VERIFICATION_FAILED: 'OTP verification failed',
  },

  // Post errors
  POST: {
    NOT_FOUND: 'Post not found',
    CREATION_FAILED: 'Failed to create post',
    UPDATE_FAILED: 'Failed to update post',
    DELETE_FAILED: 'Failed to delete post',
    PERMISSION_DENIED: 'You do not have permission to modify this post',
    ALREADY_LIKED: 'You have already liked this post',
    NOT_LIKED: 'You have not liked this post',
    MEDIA_UPLOAD_FAILED: 'Failed to upload media',
  },

  // Comment errors
  COMMENT: {
    NOT_FOUND: 'Comment not found',
    CREATION_FAILED: 'Failed to create comment',
    DELETE_FAILED: 'Failed to delete comment',
    PERMISSION_DENIED: 'You do not have permission to modify this comment',
    PARENT_NOT_FOUND: 'Parent comment not found',
  },

  // Journey errors
  JOURNEY: {
    NOT_FOUND: 'Journey not found',
    CREATION_FAILED: 'Failed to create journey',
    UPDATE_FAILED: 'Failed to update journey',
    DELETE_FAILED: 'Failed to delete journey',
    PERMISSION_DENIED: 'You do not have permission to modify this journey',
    DAY_NOT_FOUND: 'Journey day not found',
    PLACE_NOT_FOUND: 'Journey place not found',
  },

  // Chat errors
  CHAT: {
    MESSAGE_NOT_FOUND: 'Message not found',
    SEND_FAILED: 'Failed to send message',
    CONVERSATION_NOT_FOUND: 'Conversation not found',
    CANNOT_MESSAGE_SELF: 'You cannot send messages to yourself',
    RECEIVER_NOT_FOUND: 'Recipient not found',
  },

  // File upload errors
  FILE: {
    TOO_LARGE: 'File size exceeds the maximum allowed limit',
    INVALID_TYPE: 'Invalid file type',
    UPLOAD_FAILED: 'File upload failed',
    DELETE_FAILED: 'Failed to delete file',
    INVALID_DIMENSIONS: 'Image dimensions do not meet requirements',
    NO_FILE_PROVIDED: 'No file was provided',
  },

  // Database errors
  DATABASE: {
    CONNECTION_FAILED: 'Database connection failed',
    QUERY_FAILED: 'Database query failed',
    TRANSACTION_FAILED: 'Database transaction failed',
  },

  // Email errors
  EMAIL: {
    SEND_FAILED: 'Failed to send email',
    INVALID_EMAIL: 'Invalid email address',
    TEMPLATE_NOT_FOUND: 'Email template not found',
  },
} as const;
