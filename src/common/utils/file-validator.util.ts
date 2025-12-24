/**
 * File validation utility functions
 * Validates file uploads for security and compliance
 */

import { BadRequestException } from '@nestjs/common';
import { FILE_UPLOAD } from '../constants';
import { ImageMimeType, VideoMimeType } from '../enums';

export interface FileValidationOptions {
  maxSize?: number;
  allowedMimeTypes?: string[];
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
}

export class FileValidatorUtil {
  /**
   * Validate image file upload
   */
  static validateImageFile(
    file: Express.Multer.File,
    options?: FileValidationOptions,
  ): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size
    const maxSize = options?.maxSize || FILE_UPLOAD.MAX_SIZE;
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      throw new BadRequestException(
        `File size exceeds ${maxSizeMB}MB limit`,
      );
    }

    // Validate MIME type
    const allowedTypes = options?.allowedMimeTypes || FILE_UPLOAD.ALLOWED_IMAGE_TYPES;
    if (!allowedTypes.includes(file.mimetype as any)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
      );
    }

    // Validate file has buffer (for further processing)
    if (!file.buffer) {
      throw new BadRequestException('File buffer is missing');
    }
  }

  /**
   * Validate video file upload
   */
  static validateVideoFile(
    file: Express.Multer.File,
    options?: FileValidationOptions,
  ): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size
    const maxSize = options?.maxSize || FILE_UPLOAD.POST_VIDEO_MAX_SIZE;
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      throw new BadRequestException(
        `Video size exceeds ${maxSizeMB}MB limit`,
      );
    }

    // Validate MIME type
    const allowedTypes = options?.allowedMimeTypes || FILE_UPLOAD.ALLOWED_VIDEO_TYPES;
    if (!allowedTypes.includes(file.mimetype as any)) {
      throw new BadRequestException(
        `Invalid video type. Allowed types: ${allowedTypes.join(', ')}`,
      );
    }
  }

  /**
   * Validate profile image
   */
  static validateProfileImage(file: Express.Multer.File): void {
    this.validateImageFile(file, {
      maxSize: FILE_UPLOAD.PROFILE_IMAGE_MAX_SIZE,
      allowedMimeTypes: FILE_UPLOAD.ALLOWED_IMAGE_TYPES as unknown as string[],
    });
  }

  /**
   * Validate banner image
   */
  static validateBannerImage(file: Express.Multer.File): void {
    this.validateImageFile(file, {
      maxSize: FILE_UPLOAD.BANNER_IMAGE_MAX_SIZE,
      allowedMimeTypes: FILE_UPLOAD.ALLOWED_IMAGE_TYPES as unknown as string[],
    });
  }

  /**
   * Validate post media
   */
  static validatePostMedia(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check if image or video
    const isImage = FILE_UPLOAD.ALLOWED_IMAGE_TYPES.includes(file.mimetype as any);
    const isVideo = FILE_UPLOAD.ALLOWED_VIDEO_TYPES.includes(file.mimetype as any);

    if (!isImage && !isVideo) {
      throw new BadRequestException(
        'Invalid media type. Please upload an image or video',
      );
    }

    if (isImage) {
      this.validateImageFile(file, {
        maxSize: FILE_UPLOAD.POST_IMAGE_MAX_SIZE,
      });
    } else if (isVideo) {
      this.validateVideoFile(file, {
        maxSize: FILE_UPLOAD.POST_VIDEO_MAX_SIZE,
      });
    }
  }

  /**
   * Sanitize filename
   */
  static sanitizeFilename(filename: string): string {
    // Remove path traversal attempts
    let sanitized = filename.replace(/\.\./g, '');

    // Remove special characters except dot, dash, underscore
    sanitized = sanitized.replace(/[^a-zA-Z0-9.-_]/g, '_');

    // Convert to lowercase
    sanitized = sanitized.toLowerCase();

    // Limit length
    if (sanitized.length > 255) {
      const ext = sanitized.split('.').pop();
      sanitized = sanitized.substring(0, 250) + '.' + ext;
    }

    return sanitized;
  }

  /**
   * Get file extension
   */
  static getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  }

  /**
   * Validate file extension matches MIME type
   */
  static validateExtensionMatchesMimeType(file: Express.Multer.File): boolean {
    const extension = this.getFileExtension(file.originalname);
    const mimeType = file.mimetype;

    const mimeTypeToExtension: Record<string, string[]> = {
      [ImageMimeType.JPEG]: ['jpg', 'jpeg'],
      [ImageMimeType.PNG]: ['png'],
      [ImageMimeType.WEBP]: ['webp'],
      [ImageMimeType.GIF]: ['gif'],
      [VideoMimeType.MP4]: ['mp4'],
      [VideoMimeType.WEBM]: ['webm'],
    };

    const expectedExtensions = mimeTypeToExtension[mimeType];
    if (!expectedExtensions) {
      return false;
    }

    return expectedExtensions.includes(extension);
  }

  /**
   * Check if file is an image
   */
  static isImage(file: Express.Multer.File): boolean {
    return FILE_UPLOAD.ALLOWED_IMAGE_TYPES.includes(file.mimetype as any);
  }

  /**
   * Check if file is a video
   */
  static isVideo(file: Express.Multer.File): boolean {
    return FILE_UPLOAD.ALLOWED_VIDEO_TYPES.includes(file.mimetype as any);
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate multiple files
   */
  static validateMultipleFiles(
    files: Express.Multer.File[],
    maxFiles: number = 10,
  ): void {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    if (files.length > maxFiles) {
      throw new BadRequestException(
        `Too many files. Maximum ${maxFiles} files allowed`,
      );
    }

    files.forEach((file, index) => {
      try {
        this.validatePostMedia(file);
      } catch (error) {
        throw new BadRequestException(
          `File ${index + 1}: ${error.message}`,
        );
      }
    });
  }
}
