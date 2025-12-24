/**
 * Standardized success messages
 */

export const SUCCESS_MESSAGES = {
  // Generic
  SUCCESS: 'Operation completed successfully',
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',

  // Authentication
  AUTH: {
    SIGNUP_SUCCESS: 'User registered successfully. Please verify your email',
    SIGNIN_SUCCESS: 'Login successful',
    SIGNOUT_SUCCESS: 'Logout successful',
    OTP_SENT: 'OTP sent to your email',
    OTP_VERIFIED: 'OTP verified successfully',
    EMAIL_VERIFIED: 'Email verified successfully',
    PASSWORD_RESET_REQUESTED: 'Password reset OTP sent to your email',
    PASSWORD_RESET_SUCCESS: 'Password reset successful',
    PASSWORD_CHANGED: 'Password changed successfully',
  },

  // User
  USER: {
    PROFILE_UPDATED: 'Profile updated successfully',
    IMAGE_UPLOADED: 'Image uploaded successfully',
    FOLLOW_SUCCESS: 'Successfully followed user',
    UNFOLLOW_SUCCESS: 'Successfully unfollowed user',
  },

  // Post
  POST: {
    CREATED: 'Post created successfully',
    UPDATED: 'Post updated successfully',
    DELETED: 'Post deleted successfully',
    LIKED: 'Post liked successfully',
    UNLIKED: 'Post unliked successfully',
    MEDIA_UPLOADED: 'Media uploaded successfully',
    FETCH_SUCCESS: 'Posts retrieved successfully',
  },

  // Comment
  COMMENT: {
    CREATED: 'Comment added successfully',
    UPDATED: 'Comment updated successfully',
    DELETED: 'Comment deleted successfully',
  },

  // Journey
  JOURNEY: {
    CREATED: 'Journey created successfully',
    UPDATED: 'Journey updated successfully',
    DELETED: 'Journey deleted successfully',
    DAY_ADDED: 'Journey day added successfully',
    PLACE_ADDED: 'Place added to journey successfully',
  },

  // Chat
  CHAT: {
    MESSAGE_SENT: 'Message sent successfully',
    MESSAGE_DELETED: 'Message deleted successfully',
    MESSAGES_READ: 'Messages marked as read',
  },

  // File
  FILE: {
    UPLOAD_SUCCESS: 'File uploaded successfully',
    DELETE_SUCCESS: 'File deleted successfully',
  },
} as const;
