import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private s3: AWS.S3;

  constructor(private configService: ConfigService) {
    this.s3 = new AWS.S3({
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get<string>('AWS_REGION'),
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
    userId: string,
  ): Promise<string> {
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

      const uploadParams: AWS.S3.PutObjectRequest = {
        Bucket: bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype || 'application/octet-stream',
        // ACL removed - bucket policy will handle public access
      };

      this.logger.log(`Uploading file: ${fileName} to bucket: ${bucketName}`);
      const result = await this.s3.upload(uploadParams).promise();
      this.logger.log(`File uploaded successfully: ${result.Location}`);
      return result.Location;
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

      const params = {
        Bucket: bucketName,
        Key: fileKey,
        Expires: expiresIn, // URL expires in 1 hour by default
      };

      const signedUrl = await this.s3.getSignedUrlPromise('getObject', params);
      return signedUrl;
    } catch (error) {
      this.logger.error(`Error generating signed URL: ${error.message}`);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
      const key = fileUrl.replace(
        `https://${bucketName}.s3.amazonaws.com/`,
        '',
      );

      const deleteParams: AWS.S3.DeleteObjectRequest = {
        Bucket: bucketName,
        Key: key,
      };

      await this.s3.deleteObject(deleteParams).promise();
      this.logger.log(`File deleted successfully: ${fileUrl}`);
    } catch (error) {
      this.logger.error(`Error deleting file from S3: ${error.message}`);
      throw new Error('Failed to delete file from S3');
    }
  }

  async uploadProfileImage(
    file: Express.Multer.File,
    userId: string,
  ): Promise<string> {
    return this.uploadFile(file, 'profile-images', userId);
  }

  async uploadBannerImage(
    file: Express.Multer.File,
    userId: string,
  ): Promise<string> {
    return this.uploadFile(file, 'banner-images', userId);
  }
}
