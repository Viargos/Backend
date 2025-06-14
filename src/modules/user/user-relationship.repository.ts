import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRelationship } from './entities/user-relationship.entity';
import { User } from './entities/user.entity';

@Injectable()
export class UserRelationshipRepository {
  constructor(
    @InjectRepository(UserRelationship)
    private readonly userRelationshipRepo: Repository<UserRelationship>,
  ) {}

  async followUser(followerId: string, followingId: string): Promise<UserRelationship> {
    const relationship = this.userRelationshipRepo.create({
      followerId,
      followingId,
    });
    return this.userRelationshipRepo.save(relationship);
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    await this.userRelationshipRepo.delete({
      followerId,
      followingId,
    });
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const relationship = await this.userRelationshipRepo.findOne({
      where: { followerId, followingId },
    });
    return !!relationship;
  }

  async getFollowers(userId: string): Promise<User[]> {
    const relationships = await this.userRelationshipRepo.find({
      where: { followingId: userId },
      relations: ['follower'],
    });
    return relationships.map(rel => rel.follower);
  }

  async getFollowing(userId: string): Promise<User[]> {
    const relationships = await this.userRelationshipRepo.find({
      where: { followerId: userId },
      relations: ['following'],
    });
    return relationships.map(rel => rel.following);
  }

  async getFollowerCount(userId: string): Promise<number> {
    return this.userRelationshipRepo.count({
      where: { followingId: userId },
    });
  }

  async getFollowingCount(userId: string): Promise<number> {
    return this.userRelationshipRepo.count({
      where: { followerId: userId },
    });
  }
} 