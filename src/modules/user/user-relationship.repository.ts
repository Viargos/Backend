import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRelationship } from './entities/user-relationship.entity';
import { User } from './entities/user.entity';

@Injectable()
export class UserRelationshipRepository extends Repository<UserRelationship> {
  constructor(
    @InjectRepository(UserRelationship)
    private readonly repository: Repository<UserRelationship>,
  ) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  async followUser(follower: User, following: User): Promise<UserRelationship> {
    const relationship = this.repository.create({
      follower: { id: follower.id },
      following: { id: following.id },
    });
    return this.repository.save(relationship);
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .delete()
      .from(UserRelationship)
      .where('follower_id = :followerId', { followerId })
      .andWhere('following_id = :followingId', { followingId })
      .execute();
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const relationship = await this.repository
      .createQueryBuilder('relationship')
      .where('relationship.follower_id = :followerId', { followerId })
      .andWhere('relationship.following_id = :followingId', { followingId })
      .getOne();
    return !!relationship;
  }

  async getFollowers(userId: string): Promise<User[]> {
    const relationships = await this.repository
      .createQueryBuilder('relationship')
      .leftJoinAndSelect('relationship.follower', 'follower')
      .where('relationship.following_id = :userId', { userId })
      .getMany();
    return relationships.map(rel => rel.follower);
  }

  async getFollowing(userId: string): Promise<User[]> {
    const relationships = await this.repository
      .createQueryBuilder('relationship')
      .leftJoinAndSelect('relationship.following', 'following')
      .where('relationship.follower_id = :userId', { userId })
      .getMany();
    return relationships.map(rel => rel.following);
  }

  async getFollowerCount(userId: string): Promise<number> {
    return this.repository
      .createQueryBuilder('relationship')
      .where('relationship.following_id = :userId', { userId })
      .getCount();
  }

  async getFollowingCount(userId: string): Promise<number> {
    return this.repository
      .createQueryBuilder('relationship')
      .where('relationship.follower_id = :userId', { userId })
      .getCount();
  }
} 