/**
 * File upload related enumerations
 */

export enum FileType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
  AUDIO = 'AUDIO',
  OTHER = 'OTHER',
}

export enum ImageMimeType {
  JPEG = 'image/jpeg',
  PNG = 'image/png',
  WEBP = 'image/webp',
  GIF = 'image/gif',
}

export enum VideoMimeType {
  MP4 = 'video/mp4',
  WEBM = 'video/webm',
  OGG = 'video/ogg',
}

export enum FileUploadFolder {
  PROFILE_IMAGES = 'profile-images',
  BANNER_IMAGES = 'banner-images',
  POSTS = 'posts',
  JOURNEYS = 'journeys',
  CHAT = 'chat',
}
