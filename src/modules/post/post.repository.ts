import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { Post } from './entities/post.entity';
import { PostMedia } from './entities/post-media.entity';
import { PostLike } from './entities/post-like.entity';
import { PostComment } from './entities/post-comment.entity';
import { AddMediaDto } from './dto/add-media.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { User } from '../user/entities/user.entity';
import { LikeResponseDto } from './dto/like-response.dto';

@Injectable()
export class PostRepository {
  private readonly logger = new Logger(PostRepository.name);

  constructor(
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(PostMedia)
    private readonly postMediaRepo: Repository<PostMedia>,
    @InjectRepository(PostLike)
    private readonly postLikeRepo: Repository<PostLike>,
    @InjectRepository(PostComment)
    private readonly postCommentRepo: Repository<PostComment>,
    private readonly dataSource: DataSource,
  ) {}

  async createPost(user: User, createPostDto: CreatePostDto): Promise<Post> {
    const post = this.postRepo.create({
      user,
      description: createPostDto.description,
      journeyId: createPostDto.journeyId,
      location: createPostDto.location,
      latitude: createPostDto.latitude,
      longitude: createPostDto.longitude,
      likeCount: 0,
      commentCount: 0,
    });
    return await this.postRepo.save(post);
  }

  async addMediaToPost(
    post: Post,
    addMediaDto: AddMediaDto,
  ): Promise<PostMedia> {
    const media = this.postMediaRepo.create({
      post,
      type: addMediaDto.type,
      url: addMediaDto.url,
      thumbnailUrl: addMediaDto.thumbnailUrl,
      duration: addMediaDto.duration,
      order: addMediaDto.order,
    });
    return await this.postMediaRepo.save(media);
  }

  async getPostById(postId: string): Promise<Post> {
    return await this.postRepo.findOne({
      where: { id: postId },
      relations: ['user', 'media', 'likes', 'comments', 'journey'],
    });
  }

  /**
   * Lightweight method to get post for like/unlike operations
   * Only fetches id and likeCount (no relations)
   */
  async getPostForLikeOperation(postId: string): Promise<Post> {
    return await this.postRepo.findOne({
      where: { id: postId },
      select: ['id', 'likeCount'],
    });
  }

  async getPublicPosts(limit: number = 10): Promise<Post[]> {
    return await this.postRepo.find({
      relations: ['user', 'media', 'likes', 'comments', 'journey'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getPostsByUserId(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<Post[]> {
    // CRITICAL: Ensure limit and offset are ALWAYS valid numbers (TypeORM requires numbers)
    // Handle all edge cases: undefined, null, NaN, strings, etc.
    let safeLimit: number = 10; // default
    let safeOffset: number = 0; // default

    // Validate limit
    if (limit !== undefined && limit !== null) {
      if (typeof limit === 'number' && !isNaN(limit) && isFinite(limit) && limit > 0) {
        safeLimit = Math.floor(limit); // Ensure it's an integer
      } else if (typeof limit === 'string') {
        const parsed = parseInt(limit, 10);
        if (!isNaN(parsed) && isFinite(parsed) && parsed > 0) {
          safeLimit = parsed;
        }
      }
    }

    // Validate offset
    if (offset !== undefined && offset !== null) {
      if (typeof offset === 'number' && !isNaN(offset) && isFinite(offset) && offset >= 0) {
        safeOffset = Math.floor(offset); // Ensure it's an integer
      } else if (typeof offset === 'string') {
        const parsed = parseInt(offset, 10);
        if (!isNaN(parsed) && isFinite(parsed) && parsed >= 0) {
          safeOffset = parsed;
        }
      }
    }

    // Final safety check - ensure we have valid numbers
    safeLimit = Number.isInteger(safeLimit) && safeLimit > 0 ? safeLimit : 10;
    safeOffset = Number.isInteger(safeOffset) && safeOffset >= 0 ? safeOffset : 0;

    this.logger.debug('getPostsByUserId called', {
      userId,
      originalLimit: limit,
      originalOffset: offset,
      safeLimit,
      safeOffset,
    });

    return await this.postRepo.find({
      where: { user: { id: userId } },
      relations: ['user', 'media', 'likes', 'comments', 'journey'],
      order: { createdAt: 'DESC' },
      take: safeLimit,
      skip: safeOffset,
    });
  }

  async getPostCountByUserId(userId: string): Promise<number> {
    return await this.postRepo.count({
      where: { user: { id: userId } },
    });
  }

  async deletePost(postId: string): Promise<void> {
    // Delete associated media first
    await this.postMediaRepo.delete({ post: { id: postId } });

    // Delete associated likes
    await this.postLikeRepo.delete({ post: { id: postId } });

    // Delete associated comments (including replies)
    await this.postCommentRepo.delete({ post: { id: postId } });

    // Finally delete the post
    await this.postRepo.delete(postId);
  }

  async updatePost(
    postId: string,
    updatePostDto: CreatePostDto,
  ): Promise<Post> {
    await this.postRepo.update(postId, {
      description: updatePostDto.description,
      journeyId: updatePostDto.journeyId,
      location: updatePostDto.location,
      latitude: updatePostDto.latitude,
      longitude: updatePostDto.longitude,
    });

    return this.getPostById(postId);
  }

  /**
   * Execute a function within a database transaction
   * Handles connection, transaction lifecycle, and cleanup
   */
  private async executeInTransaction<T>(
    operation: (queryRunner: QueryRunner) => Promise<T>,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await operation(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async likePost(post: Post, user: User): Promise<LikeResponseDto> {
    try {
      return await this.executeInTransaction(async (queryRunner) => {
        // Check if already liked within transaction
        const existingLike = await queryRunner.manager.findOne(PostLike, {
          where: { post: { id: post.id }, user: { id: user.id } },
        });

        if (existingLike) {
          // Already liked - fetch and return actual total count from database
          const currentPost = await queryRunner.manager.findOne(Post, {
            where: { id: post.id },
            select: ['likeCount'],
          });

          return {
            success: true,
            likeCount: currentPost?.likeCount || post.likeCount,
            isLiked: true,
          };
        }

        // Create the like
        const newLike = queryRunner.manager.create(PostLike, { post, user });
        await queryRunner.manager.save(newLike);

        // Increment the count atomically
        await queryRunner.manager.increment(Post, { id: post.id }, 'likeCount', 1);

        // Fetch actual total count from database (source of truth)
        const updatedPost = await queryRunner.manager.findOne(Post, {
          where: { id: post.id },
          select: ['likeCount'],
        });

        return {
          success: true,
          likeCount: updatedPost?.likeCount || 0,
          isLiked: true,
        };
      });
    } catch (error) {
      // Handle duplicate key error (unique constraint violation)
      if (error.code === '23505' || error.message?.includes('duplicate key')) {
        // Fetch actual count on error
        const currentPost = await this.postRepo.findOne({
          where: { id: post.id },
          select: ['likeCount'],
        });

        return {
          success: true,
          likeCount: currentPost?.likeCount || post.likeCount,
          isLiked: true,
        };
      }
      throw error;
    }
  }

  async unlikePost(post: Post, user: User): Promise<LikeResponseDto> {
    return await this.executeInTransaction(async (queryRunner) => {
      // Delete the like within transaction
      const result = await queryRunner.manager.delete(PostLike, {
        post: { id: post.id },
        user: { id: user.id },
      });

      if (result.affected > 0) {
        // Fetch current count before decrementing
        const currentPost = await queryRunner.manager.findOne(Post, {
          where: { id: post.id },
          select: ['likeCount'],
        });

        // Only decrement if count is greater than 0 (prevent negative)
        if (currentPost && currentPost.likeCount > 0) {
          await queryRunner.manager.decrement(Post, { id: post.id }, 'likeCount', 1);
        }

        // Fetch actual total count from database (source of truth)
        const updatedPost = await queryRunner.manager.findOne(Post, {
          where: { id: post.id },
          select: ['likeCount'],
        });

        return {
          success: true,
          likeCount: updatedPost?.likeCount || 0,
          isLiked: false,
        };
      }

      // Like didn't exist - fetch and return actual count
      const currentPost = await queryRunner.manager.findOne(Post, {
        where: { id: post.id },
        select: ['likeCount'],
      });

      return {
        success: true,
        likeCount: currentPost?.likeCount || 0,
        isLiked: false,
      };
    });
  }

  async addComment(
    post: Post,
    user: User,
    content: string,
    parentComment?: PostComment,
  ): Promise<PostComment> {
    const comment = this.postCommentRepo.create({
      post,
      user,
      content,
      parent: parentComment,
      replyCount: 0,
    });

    const savedComment = await this.postCommentRepo.save(comment);

    if (parentComment) {
      await this.postCommentRepo.increment(
        { id: parentComment.id },
        'replyCount',
        1,
      );
    }

    await this.postRepo.increment({ id: post.id }, 'commentCount', 1);

    return savedComment;
  }

  async deleteComment(comment: PostComment): Promise<void> {
    if (comment) {
      if (comment.parent) {
        await this.postCommentRepo.decrement(
          { id: comment.parent.id },
          'replyCount',
          1,
        );
      }

      await this.postRepo.decrement({ id: comment.post.id }, 'commentCount', 1);
      await this.postCommentRepo.delete(comment.id);
    }
  }

  async getComments(
    postId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<PostComment[]> {
    return await this.postCommentRepo.find({
      where: { post: { id: postId }, parent: null },
      relations: ['user', 'post'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getReplies(
    commentId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<PostComment[]> {
    return await this.postCommentRepo.find({
      where: { parent: { id: commentId } },
      relations: ['user', 'post'],
      order: { createdAt: 'ASC' },
      take: limit,
      skip: offset,
    });
  }

  async getDashboardPosts(
    cursor?: string,
    limit: number = 20,
    location?: string,
    search?: string,
  ): Promise<{
    posts: Post[];
    hasMore: boolean;
    nextCursor?: string;
    totalCount: number;
  }> {
    let queryBuilder = this.postRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('post.media', 'media')
      .leftJoinAndSelect('post.journey', 'journey')
      .leftJoinAndSelect('post.likes', 'likes', 'likes.user = user.id')
      .loadRelationCountAndMap('post.isLikedByUser', 'post.likes', 'likeAlias')
      .orderBy('post.createdAt', 'DESC')
      .addOrderBy('post.id', 'DESC'); // Add secondary sort for consistent pagination

    // Apply cursor-based pagination
    if (cursor) {
      const cursorPost = await this.postRepo.findOne({ where: { id: cursor } });
      if (cursorPost) {
        queryBuilder = queryBuilder.andWhere(
          '(post.createdAt < :cursorDate OR (post.createdAt = :cursorDate AND post.id < :cursorId))',
          {
            cursorDate: cursorPost.createdAt,
            cursorId: cursor,
          },
        );
      }
    }

    // Apply location filter
    if (location) {
      queryBuilder = queryBuilder.andWhere('post.location ILIKE :location', {
        location: `%${location}%`,
      });
    }

    // Apply search filter
    if (search) {
      queryBuilder = queryBuilder.andWhere('post.description ILIKE :search', {
        search: `%${search}%`,
      });
    }

    // Get posts with one extra to check if there are more
    const posts = await queryBuilder.limit(limit + 1).getMany();

    // Check if there are more posts
    const hasMore = posts.length > limit;
    if (hasMore) {
      posts.pop(); // Remove the extra post
    }

    // Get total count for dashboard stats (optional, can be expensive for large datasets)
    let totalCount = 0;
    if (!cursor) {
      // Only get total count on first request
      const countQueryBuilder = this.postRepo.createQueryBuilder('post');

      if (location) {
        countQueryBuilder.andWhere('post.location ILIKE :location', {
          location: `%${location}%`,
        });
      }

      if (search) {
        countQueryBuilder.andWhere('post.description ILIKE :search', {
          search: `%${search}%`,
        });
      }

      totalCount = await countQueryBuilder.getCount();
    }

    return {
      posts,
      hasMore,
      nextCursor: hasMore ? posts[posts.length - 1]?.id : undefined,
      totalCount,
    };
  }

  async getDashboardPostsWithUserLikes(
    userId: string,
    cursor?: string,
    limit: number = 20,
    location?: string,
    search?: string,
  ): Promise<{
    posts: (Post & { isLikedByCurrentUser: boolean })[];
    hasMore: boolean;
    nextCursor?: string;
    totalCount: number;
  }> {
    let queryBuilder = this.postRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('post.media', 'media')
      .leftJoinAndSelect('post.journey', 'journey')
      .leftJoin('post.likes', 'userLike', 'userLike.user.id = :userId', {
        userId,
      })
      .addSelect(
        'CASE WHEN userLike.id IS NOT NULL THEN true ELSE false END',
        'isLikedByCurrentUser',
      )
      .orderBy('post.createdAt', 'DESC')
      .addOrderBy('post.id', 'DESC');

    // Apply cursor-based pagination
    if (cursor) {
      const cursorPost = await this.postRepo.findOne({ where: { id: cursor } });
      if (cursorPost) {
        queryBuilder = queryBuilder.andWhere(
          '(post.createdAt < :cursorDate OR (post.createdAt = :cursorDate AND post.id < :cursorId))',
          {
            cursorDate: cursorPost.createdAt,
            cursorId: cursor,
          },
        );
      }
    }

    // Apply location filter
    if (location) {
      queryBuilder = queryBuilder.andWhere('post.location ILIKE :location', {
        location: `%${location}%`,
      });
    }

    // Apply search filter
    if (search) {
      queryBuilder = queryBuilder.andWhere('post.description ILIKE :search', {
        search: `%${search}%`,
      });
    }

    // Get posts with one extra to check if there are more
    const rawResults = await queryBuilder.limit(limit + 1).getRawAndEntities();

    // Map the results to include isLikedByCurrentUser
    const postsWithLikes = rawResults.entities.map((post, index) => ({
      ...post,
      isLikedByCurrentUser:
        rawResults.raw[index]?.isLikedByCurrentUser === 'true' ||
        rawResults.raw[index]?.isLikedByCurrentUser === true,
    }));

    // Check if there are more posts
    const hasMore = postsWithLikes.length > limit;
    if (hasMore) {
      postsWithLikes.pop(); // Remove the extra post
    }

    // Get total count for dashboard stats (optional)
    let totalCount = 0;
    if (!cursor) {
      const countQueryBuilder = this.postRepo.createQueryBuilder('post');

      if (location) {
        countQueryBuilder.andWhere('post.location ILIKE :location', {
          location: `%${location}%`,
        });
      }

      if (search) {
        countQueryBuilder.andWhere('post.description ILIKE :search', {
          search: `%${search}%`,
        });
      }

      totalCount = await countQueryBuilder.getCount();
    }

    return {
      posts: postsWithLikes as (Post & { isLikedByCurrentUser: boolean })[],
      hasMore,
      nextCursor: hasMore
        ? postsWithLikes[postsWithLikes.length - 1]?.id
        : undefined,
      totalCount,
    };
  }
}
