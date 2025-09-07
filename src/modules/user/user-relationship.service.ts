import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { User } from './entities/user.entity';
import { FollowUserDto } from './dto/follow-user.dto';
import { UserRepository } from './user.repository';
import { UserRelationshipRepository } from './user-relationship.repository';

@Injectable()
export class UserRelationshipService {
  constructor(
    private readonly userRelationshipRepo: UserRelationshipRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async followUser(follower: User, followUserDto: FollowUserDto): Promise<{ message: string }> {
    const { userId: followingId } = followUserDto;    

    // Check if user exists
    const followingUser = await this.userRepository.getUserById(followingId);
    if (!followingUser) {
      throw new NotFoundException('User not found');
    }

    // Prevent self-following
    if (follower.id === followingId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    // Check if already following
    const isFollowing = await this.userRelationshipRepo.isFollowing(follower.id, followingId);
    if (isFollowing) {
      throw new BadRequestException('You are already following this user');
    }

    // Create follow relationship
    await this.userRelationshipRepo.followUser(follower, followingUser);
    return { message: 'Successfully followed user' };
  }

  async unfollowUser(follower: User, followingId: string): Promise<{ message: string }> {
    // Check if user exists
    const followingUser = await this.userRepository.getUserById(followingId);
    if (!followingUser) {
      throw new NotFoundException('User not found');
    }

    // Check if following
    const isFollowing = await this.userRelationshipRepo.isFollowing(follower.id, followingId);
    if (!isFollowing) {
      throw new BadRequestException('You are not following this user');
    }

    // Remove follow relationship
    await this.userRelationshipRepo.unfollowUser(follower.id, followingId);
    return { message: 'Successfully unfollowed user' };
  }

  async getFollowers(userId: string): Promise<User[]> {
    return this.userRelationshipRepo.getFollowers(userId);
  }

  async getFollowing(userId: string): Promise<User[]> {
    return this.userRelationshipRepo.getFollowing(userId);
  }

  async getFollowerCount(userId: string): Promise<number> {
    return this.userRelationshipRepo.getFollowerCount(userId);
  }

  async getFollowingCount(userId: string): Promise<number> {
    return this.userRelationshipRepo.getFollowingCount(userId);
  }

  async getRelationshipStatus(currentUserId: string, targetUserId: string): Promise<{
    isFollowing: boolean;
    isFollowedBy: boolean;
  }> {
    if (!currentUserId || currentUserId === targetUserId) {
      return { isFollowing: false, isFollowedBy: false };
    }

    const [isFollowing, isFollowedBy] = await Promise.all([
      this.userRelationshipRepo.isFollowing(currentUserId, targetUserId),
      this.userRelationshipRepo.isFollowing(targetUserId, currentUserId),
    ]);

    return { isFollowing, isFollowedBy };
  }
}
