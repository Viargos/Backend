import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { User } from '../user/entities/user.entity';
import { S3Service } from './s3.service';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly s3Service: S3Service,
  ) {}

  async findUserById(id: string): Promise<User> {
    return this.userRepository.getUserById(id);
  }

  async findUsers(condition: Partial<User> = {}): Promise<User[]> {
    return this.userRepository.getUsers(condition);
  }

  async createUser(userData: Partial<User>): Promise<User> {
    return this.userRepository.createUser(userData);
  }

  async updateUser(userId: string, updateData: Partial<User>): Promise<User> {
    return this.userRepository.updateUser(userId, updateData);
  }

  async deleteUser(userId: string): Promise<void> {
    return await this.userRepository.deleteUser(userId);
  }

  async uploadProfileImage(
    userId: string,
    file: any,
  ): Promise<string> {
    const user = await this.userRepository.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete old profile image if exists
    if (user.profileImage) {
      try {
        await this.s3Service.deleteFile(user.profileImage);
      } catch (error) {
        // Log error but don't fail the upload
        console.error('Failed to delete old profile image:', error);
      }
    }

    // Upload new image
    const imageUrl = await this.s3Service.uploadProfileImage(file, userId);

    // Update user profile
    await this.userRepository.updateUser(userId, { profileImage: imageUrl });

    return imageUrl;
  }

  async uploadBannerImage(
    userId: string,
    file: any,
  ): Promise<string> {
    const user = await this.userRepository.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete old banner image if exists
    if (user.bannerImage) {
      try {
        await this.s3Service.deleteFile(user.bannerImage);
      } catch (error) {
        // Log error but don't fail the upload
        console.error('Failed to delete old banner image:', error);
      }
    }

    // Upload new image
    const imageUrl = await this.s3Service.uploadBannerImage(file, userId);

    // Update user profile
    await this.userRepository.updateUser(userId, { bannerImage: imageUrl });

    return imageUrl;
  }

  async getSignedUrl(fileKey: string): Promise<string> {
    return this.s3Service.getSignedUrl(fileKey);
  }
}
