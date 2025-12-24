import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { User } from '../user/entities/user.entity';
import { S3Service } from './s3.service';
import { UserRelationshipService } from './user-relationship.service';
import { PostService } from '../post/post.service';
import { JourneyService } from '../journey/journey.service';
import { UserProfileResponseDto, UserStatsDto } from './dto/user-profile-response.dto';
import { SearchUserDto, SearchUserResult } from './dto/search-user.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly s3Service: S3Service,
    private readonly userRelationshipService: UserRelationshipService,
    private readonly postService: PostService,
    private readonly journeyService: JourneyService,
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

  /**
   * Generate a pre-signed S3 upload URL for the current user.
   */
  async getUploadSignedUrl(params: {
    userId: string;
    fileName: string;
    contentType: string;
    folder?: string;
  }) {
    const { userId, fileName, contentType, folder } = params;
    return this.s3Service.getUploadSignedUrl({
      userId,
      fileName,
      contentType,
      folder,
    });
  }

  async getUserProfile(userId: string, currentUserId?: string): Promise<UserProfileResponseDto> {
    // Get user details
    const user = await this.userRepository.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get all counts and relationship status in parallel for better performance
    const [followersCount, followingCount, postsCount, journeysCount, relationshipStatus] = await Promise.all([
      this.userRelationshipService.getFollowerCount(userId),
      this.userRelationshipService.getFollowingCount(userId),
      this.postService.getPostCountByUser(userId),
      this.journeyService.getJourneyCountByUser(userId),
      currentUserId ? this.userRelationshipService.getRelationshipStatus(currentUserId, userId) : Promise.resolve({ isFollowing: false, isFollowedBy: false })
    ]);

    // Create stats object
    const stats: UserStatsDto = {
      followersCount,
      followingCount,
      postsCount,
      journeysCount,
    };

    // Get recent data (limit to 5 items each for performance)
    const [recentFollowers, recentFollowing, recentPosts, recentJourneys] = await Promise.all([
      this.userRelationshipService.getFollowers(userId),
      this.userRelationshipService.getFollowing(userId),
      this.postService.getPostsByUser(userId, 5, 0), // Latest 5 posts
      this.journeyService.findByUser(userId), // All journeys (usually not too many)
    ]);

    // Return comprehensive profile
    return new UserProfileResponseDto(
      user,
      stats,
      relationshipStatus,
      recentFollowers.slice(0, 5), // Latest 5 followers
      recentFollowing.slice(0, 5), // Latest 5 following
      recentPosts,
      recentJourneys.slice(0, 5) // Latest 5 journeys
    );
  }

  async searchUsers(searchDto: SearchUserDto): Promise<SearchUserResult> {
    return this.userRepository.searchUsers(searchDto);
  }

  async searchUsersByTerm(searchTerm: string, limit: number = 10): Promise<User[]> {
    return this.userRepository.searchUsersByTerm(searchTerm, limit);
  }
}
