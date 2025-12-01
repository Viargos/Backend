import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
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
  }

  async uploadFile(file: any, folder: string, userId: string): Promise<string> {
    try {
      // Validate file
      if (!file || !file.buffer) {
        throw new Error('No file or file buffer provided');
      }

      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${folder}/${userId}/${uuidv4()}.${fileExtension}`;
      const bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');

      if (!bucketName) {
        throw new Error('AWS_S3_BUCKET_NAME not configured');
      }

      const uploadCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype || 'application/octet-stream',
        // ACL removed - bucket policy will handle public access
      });

      this.logger.log(`Uploading file: ${fileName} to bucket: ${bucketName}`);
      const result = await this.s3Client.send(uploadCommand);
      this.logger.log(`File uploaded successfully`);

      // Construct the URL manually since AWS SDK v3 doesn't return Location
      const region = this.configService.get<string>('AWS_REGION');
      const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`;
      return fileUrl;
    } catch (error) {
      this.logger.error(`Error uploading file to S3: ${error.message}`);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  async getSignedUrl(
    fileKey: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresIn,
      });
      return signedUrl;
    } catch (error) {
      this.logger.error(`Error generating signed URL: ${error.message}`);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

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

      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      await this.s3Client.send(deleteCommand);
      this.logger.log(`File deleted successfully: ${fileUrl}`);
    } catch (error) {
      this.logger.error(`Error deleting file from S3: ${error.message}`);
      throw new Error('Failed to delete file from S3');
    }
  }

  async uploadProfileImage(file: any, userId: string): Promise<string> {
    return this.uploadFile(file, 'profile-images', userId);
  }

  async uploadBannerImage(file: any, userId: string): Promise<string> {
    return this.uploadFile(file, 'banner-images', userId);
  }
}
