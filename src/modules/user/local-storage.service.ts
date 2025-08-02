import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LocalStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private uploadDir: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDir();
  }

  private ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
    userId: string,
  ): Promise<string> {
    try {
      if (!file || !file.buffer) {
        throw new Error('No file or file buffer provided');
      }

      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const folderPath = path.join(this.uploadDir, folder, userId);

      // Create folder if it doesn't exist
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const filePath = path.join(folderPath, fileName);
      fs.writeFileSync(filePath, file.buffer);

      // Return the URL path (not the full file system path)
      const urlPath = `/uploads/${folder}/${userId}/${fileName}`;
      this.logger.log(`File uploaded successfully: ${urlPath}`);
      return urlPath;
    } catch (error) {
      this.logger.error(`Error uploading file locally: ${error.message}`);
      throw new Error(`Failed to upload file locally: ${error.message}`);
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Convert URL path to file system path
      const filePath = path.join(process.cwd(), fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`File deleted successfully: ${fileUrl}`);
      }
    } catch (error) {
      this.logger.error(`Error deleting file locally: ${error.message}`);
      throw new Error('Failed to delete file locally');
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
