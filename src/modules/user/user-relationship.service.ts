import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRelationshipRepository } from './user-relationship.repository';
import { UserRepository } from './user.repository';
import { FollowUserDto } from './dto/follow-user.dto';

@Injectable()
export class UserRelationshipService {
  constructor(
    private readonly userRelationshipRepo: UserRelationshipRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async followUser(followerId: string, followUserDto: FollowUserDto): Promise<{ message: string }> {
    const { userId: followingId } = followUserDto;

    // Check if user exists
    const followingUser = await this.userRepository.getUserById(followingId);
    if (!followingUser) {
      throw new NotFoundException('User not found');
    }

    // Prevent self-following
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    // Check if already following
    const isFollowing = await this.userRelationshipRepo.isFollowing(followerId, followingId);
    if (isFollowing) {
      throw new BadRequestException('You are already following this user');
    }

    // Create follow relationship
    await this.userRelationshipRepo.followUser(followerId, followingId);
    return { message: 'Successfully followed user' };
  }

  async unfollowUser(followerId: string, followingId: string): Promise<{ message: string }> {
    // Check if user exists
    const followingUser = await this.userRepository.getUserById(followingId);
    if (!followingUser) {
      throw new NotFoundException('User not found');
    }

    // Check if following
    const isFollowing = await this.userRelationshipRepo.isFollowing(followerId, followingId);
    if (!isFollowing) {
      throw new BadRequestException('You are not following this user');
    }

    // Remove follow relationship
    await this.userRelationshipRepo.unfollowUser(followerId, followingId);
    return { message: 'Successfully unfollowed user' };
  }

  async getFollowers(userId: string) {
    const followers = await this.userRelationshipRepo.getFollowers(userId);
    const count = await this.userRelationshipRepo.getFollowerCount(userId);
    return {
      followers,
      count,
    };
  }

  async getFollowing(userId: string) {
    const following = await this.userRelationshipRepo.getFollowing(userId);
    const count = await this.userRelationshipRepo.getFollowingCount(userId);
    return {
      following,
      count,
    };
  }
} 