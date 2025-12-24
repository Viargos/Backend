/**
 * File upload related constants
 */

import { ImageMimeType, VideoMimeType } from '../enums';

export const FILE_UPLOAD = {
  // File size limits (in bytes)
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  PROFILE_IMAGE_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  BANNER_IMAGE_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  POST_IMAGE_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  POST_VIDEO_MAX_SIZE: 50 * 1024 * 1024, // 50MB

  // Allowed MIME types
  ALLOWED_IMAGE_TYPES: [
    ImageMimeType.JPEG,
    ImageMimeType.PNG,
    ImageMimeType.WEBP,
    ImageMimeType.GIF,
  ],

  ALLOWED_VIDEO_TYPES: [
    VideoMimeType.MP4,
    VideoMimeType.WEBM,
  ],

  // Image dimensions
  PROFILE_IMAGE: {
    MAX_WIDTH: 1000,
    MAX_HEIGHT: 1000,
    MIN_WIDTH: 100,
    MIN_HEIGHT: 100,
  },

  BANNER_IMAGE: {
    MAX_WIDTH: 1920,
    MAX_HEIGHT: 500,
    MIN_WIDTH: 800,
    MIN_HEIGHT: 200,
  },

  POST_IMAGE: {
    MAX_WIDTH: 4000,
    MAX_HEIGHT: 4000,
  },
} as const;

export const S3_CONFIG = {
  FOLDERS: {
    PROFILE_IMAGES: 'profile-images',
    BANNER_IMAGES: 'banner-images',
    POSTS: 'posts',
    JOURNEYS: 'journeys',
    CHAT: 'chat',
  },
  PRESIGNED_URL_EXPIRY: 3600, // 1 hour in seconds
} as const;
