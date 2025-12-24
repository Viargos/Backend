import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// ✅ NEW: Import utilities and constants
import {
  Logger,
  FileValidatorUtil,
} from '../../common/utils';
import {
  ERROR_MESSAGES,
  S3_CONFIG,
} from '../../common/constants';
import { FileUploadFolder } from '../../common/enums';

@Injectable()
export class S3Service {
  // ✅ NEW: Use our custom logger
  private readonly logger = Logger.child({
    service: 'S3Service',
  });
  private s3Client: S3Client;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      credentials: {
        accessKeyId: this.configService.get<string>('VIARGOS_AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>(
          'VIARGOS_AWS_SECRET_ACCESS_KEY',
        ),
      },
      region: this.configService.get<string>('AWS_REGION'),
    });

    // ✅ NEW: Log S3 client initialization
    this.logger.info('S3 client initialized', {
      region: this.configService.get<string>('AWS_REGION'),
      bucket: this.configService.get<string>('AWS_S3_BUCKET_NAME'),
    });
  }

  /**
   * Upload file to S3 with validation
   * ✅ NEW: Proper type safety with Express.Multer.File
   * ✅ NEW: Uses FileUploadFolder enum
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: FileUploadFolder | string,
    userId: string,
  ): Promise<string> {
    try {
      // ✅ NEW: Comprehensive file validation
      if (!file || !file.buffer) {
        this.logger.warn('Upload failed: No file or buffer provided', { userId });
        throw new BadRequestException(ERROR_MESSAGES.FILE.NO_FILE_PROVIDED);
      }

      // ✅ NEW: Validate file based on folder type
      this.validateFileByFolder(file, folder);

      // ✅ NEW: Sanitize filename to prevent path traversal
      const sanitizedOriginalName = FileValidatorUtil.sanitizeFilename(file.originalname);
      const fileExtension = FileValidatorUtil.getFileExtension(sanitizedOriginalName);

      // ✅ NEW: Generate secure filename
      const fileName = `${folder}/${userId}/${uuidv4()}.${fileExtension}`;
      const bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');

      if (!bucketName) {
        this.logger.error('S3 bucket name not configured');
        throw new BadRequestException('AWS_S3_BUCKET_NAME not configured');
      }

      // ✅ NEW: Log upload attempt with file details
      this.logger.info('Starting file upload', {
        userId,
        folder,
        fileName: sanitizedOriginalName,
        fileSize: FileValidatorUtil.formatFileSize(file.size),
        mimeType: file.mimetype,
      });

      const uploadCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype || 'application/octet-stream',
        // ACL removed - bucket policy will handle public access
      });

      const result = await this.s3Client.send(uploadCommand);

      // Construct the URL manually since AWS SDK v3 doesn't return Location
      const region = this.configService.get<string>('AWS_REGION');
      const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`;

      // ✅ NEW: Log successful upload with URL
      this.logger.info('File uploaded successfully', {
        userId,
        folder,
        fileName: sanitizedOriginalName,
        s3Key: fileName,
        fileSize: FileValidatorUtil.formatFileSize(file.size),
      });

      return fileUrl;
    } catch (error) {
      // ✅ NEW: Better error logging
      this.logger.error('File upload failed', {
        userId,
        folder,
        error: error.message,
        fileName: file?.originalname,
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        `${ERROR_MESSAGES.FILE.UPLOAD_FAILED}: ${error.message}`,
      );
    }
  }

  /**
   * ✅ NEW: Validate file based on upload folder type
   */
  private validateFileByFolder(
    file: Express.Multer.File,
    folder: FileUploadFolder | string,
  ): void {
    switch (folder) {
      case FileUploadFolder.PROFILE_IMAGES:
        FileValidatorUtil.validateProfileImage(file);
        break;

      case FileUploadFolder.BANNER_IMAGES:
        FileValidatorUtil.validateBannerImage(file);
        break;

      case FileUploadFolder.POSTS:
      case FileUploadFolder.JOURNEYS:
        FileValidatorUtil.validatePostMedia(file);
        break;

      case FileUploadFolder.CHAT:
        FileValidatorUtil.validatePostMedia(file);
        break;

      default:
        // Generic validation for custom folders
        FileValidatorUtil.validateImageFile(file);
        break;
    }
  }

  /**
   * Get signed URL for private file access
   */
  async getSignedUrl(
    fileKey: string,
    expiresIn: number = S3_CONFIG.PRESIGNED_URL_EXPIRY,
  ): Promise<string> {
    try {
      const bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');

      // ✅ NEW: Log signed URL generation
      this.logger.info('Generating signed URL', {
        fileKey,
        expiresIn,
      });

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresIn,
      });

      // ✅ NEW: Log successful generation
      this.logger.info('Signed URL generated successfully', {
        fileKey,
        expiresIn,
      });

      return signedUrl;
    } catch (error) {
      // ✅ NEW: Better error logging
      this.logger.error('Failed to generate signed URL', {
        fileKey,
        error: error.message,
      });

      throw new BadRequestException(
        `Failed to generate signed URL: ${error.message}`,
      );
    }
  }

  /**
   * Generate a pre-signed URL for uploading a file directly to S3
   * using AWS SDK v3 (PutObjectCommand + getSignedUrl).
   */
  async getUploadSignedUrl(params: {
    fileName: string;
    contentType: string;
    folder?: FileUploadFolder | string;
    userId: string;
  }): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
    const { fileName, contentType, folder, userId } = params;

    const bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
    const region = this.configService.get<string>('AWS_REGION');

    if (!bucketName) {
      this.logger.error('S3 bucket name not configured for upload presign');
      throw new BadRequestException('AWS_S3_BUCKET_NAME not configured');
    }

    if (!region) {
      this.logger.error('AWS region not configured for upload presign');
      throw new BadRequestException('AWS_REGION not configured');
    }

    // Normalize folder using known S3_CONFIG folders when possible
    let targetFolder: string | undefined = folder;
    if (!targetFolder) {
      targetFolder = S3_CONFIG.FOLDERS.POSTS;
    }

    const sanitizedFileName =
      FileValidatorUtil.sanitizeFilename(fileName) || 'upload';
    const extension = FileValidatorUtil.getFileExtension(sanitizedFileName);
    const baseName = sanitizedFileName.replace(/\.[^.]+$/, '');

    const key = `${targetFolder}/${userId}/${baseName}-${uuidv4()}${
      extension ? `.${extension}` : ''
    }`;

    this.logger.info('Generating upload signed URL', {
      userId,
      key,
      contentType,
    });

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType || 'application/octet-stream',
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: S3_CONFIG.PRESIGNED_URL_EXPIRY,
    });

    const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

    return {
      uploadUrl,
      fileUrl,
      key,
    };
  }

  /**
   * Delete file from S3
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
      const region = this.configService.get<string>('AWS_REGION');

      // Handle both old and new URL formats
      let key = fileUrl;
      if (fileUrl.includes('amazonaws.com/')) {
        key = fileUrl
          .replace(`https://${bucketName}.s3.${region}.amazonaws.com/`, '')
          .replace(`https://${bucketName}.s3.amazonaws.com/`, '');
      }

      // ✅ NEW: Log deletion attempt
      this.logger.info('Deleting file from S3', {
        fileUrl: fileUrl.substring(0, 100), // Truncate long URLs
        s3Key: key,
      });

      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      await this.s3Client.send(deleteCommand);

      // ✅ NEW: Log successful deletion
      this.logger.info('File deleted successfully', {
        s3Key: key,
      });
    } catch (error) {
      // ✅ NEW: Better error logging
      this.logger.error('Failed to delete file from S3', {
        fileUrl: fileUrl.substring(0, 100),
        error: error.message,
      });

      throw new BadRequestException(ERROR_MESSAGES.FILE.DELETE_FAILED);
    }
  }

  /**
   * Upload profile image with validation
   * ✅ NEW: Proper typing and validation
   */
  async uploadProfileImage(
    file: Express.Multer.File,
    userId: string,
  ): Promise<string> {
    // ✅ NEW: Explicit validation before upload
    FileValidatorUtil.validateProfileImage(file);

    this.logger.info('Uploading profile image', {
      userId,
      fileSize: FileValidatorUtil.formatFileSize(file.size),
    });

    return this.uploadFile(file, FileUploadFolder.PROFILE_IMAGES, userId);
  }

  /**
   * Upload banner image with validation
   * ✅ NEW: Proper typing and validation
   */
  async uploadBannerImage(
    file: Express.Multer.File,
    userId: string,
  ): Promise<string> {
    // ✅ NEW: Explicit validation before upload
    FileValidatorUtil.validateBannerImage(file);

    this.logger.info('Uploading banner image', {
      userId,
      fileSize: FileValidatorUtil.formatFileSize(file.size),
    });

    return this.uploadFile(file, FileUploadFolder.BANNER_IMAGES, userId);
  }

  /**
   * ✅ NEW: Upload post media with validation
   */
  async uploadPostMedia(
    file: Express.Multer.File,
    userId: string,
  ): Promise<string> {
    FileValidatorUtil.validatePostMedia(file);

    this.logger.info('Uploading post media', {
      userId,
      fileSize: FileValidatorUtil.formatFileSize(file.size),
      mimeType: file.mimetype,
    });

    return this.uploadFile(file, FileUploadFolder.POSTS, userId);
  }

  /**
   * ✅ NEW: Upload journey photo with validation
   */
  async uploadJourneyPhoto(
    file: Express.Multer.File,
    userId: string,
  ): Promise<string> {
    FileValidatorUtil.validatePostMedia(file);

    this.logger.info('Uploading journey photo', {
      userId,
      fileSize: FileValidatorUtil.formatFileSize(file.size),
    });

    return this.uploadFile(file, FileUploadFolder.JOURNEYS, userId);
  }

  /**
   * ✅ NEW: Upload chat media with validation
   */
  async uploadChatMedia(
    file: Express.Multer.File,
    userId: string,
  ): Promise<string> {
    FileValidatorUtil.validatePostMedia(file);

    this.logger.info('Uploading chat media', {
      userId,
      fileSize: FileValidatorUtil.formatFileSize(file.size),
    });

    return this.uploadFile(file, FileUploadFolder.CHAT, userId);
  }
}
