import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PostRepository } from './post.repository';
import { CreatePostDto } from './dto/create-post.dto';
import { AddMediaDto } from './dto/add-media.dto';
import { LikeResponseDto } from './dto/like-response.dto';
import { Post } from './entities/post.entity';
import { PostMedia } from './entities/post-media.entity';
import { PostComment } from './entities/post-comment.entity';
import { User } from '../user/entities/user.entity';
import { S3Service } from '../user/s3.service';

// ✅ NEW: Import logger and constants
import { Logger } from '../../common/utils';
import { ERROR_MESSAGES } from '../../common/constants';

@Injectable()
export class PostService {
  // ✅ NEW: Add logger
  private readonly logger = Logger.child({
    service: 'PostService',
  });

  constructor(
    private readonly postRepository: PostRepository,
    private readonly s3Service: S3Service,
  ) {}

  async createPost(user: User, createPostDto: CreatePostDto): Promise<Post> {
    // ✅ NEW: Log post creation
    this.logger.info('Creating post', {
      userId: user.id,
      hasDescription: !!createPostDto.description,
      hasJourney: !!createPostDto.journeyId,
      hasLocation: !!createPostDto.location,
    });

    const post = await this.postRepository.createPost(user, createPostDto);

    // ✅ NEW: Log success
    this.logger.info('Post created successfully', {
      postId: post.id,
      userId: user.id,
    });

    return post;
  }

  async addMediaToPost(
    user: User,
    postId: string,
    addMediaDto: AddMediaDto,
  ): Promise<PostMedia> {
    const post = await this.postRepository.getPostById(postId);
    if (!post) {
      // ✅ NEW: Log not found
      this.logger.warn('Post not found for media addition', {
        postId,
        userId: user.id,
      });
      throw new NotFoundException(ERROR_MESSAGES.POST.NOT_FOUND); // ✅ FIXED: Use constant
    }

    if (post.user.id !== user.id) {
      // ✅ NEW: Log permission denied
      this.logger.warn('Unauthorized media addition attempt', {
        postId,
        userId: user.id,
        postOwnerId: post.user.id,
      });
      throw new BadRequestException(ERROR_MESSAGES.POST.PERMISSION_DENIED); // ✅ FIXED: Use constant
    }

    // ✅ NEW: Log media addition
    this.logger.info('Adding media to post', {
      postId,
      userId: user.id,
      mediaType: addMediaDto.type,
    });

    const media = await this.postRepository.addMediaToPost(post, addMediaDto);

    // ✅ NEW: Log success
    this.logger.info('Media added to post', {
      mediaId: media.id,
      postId,
      userId: user.id,
    });

    return media;
  }

  async getPost(postId: string): Promise<Post> {
    const post = await this.postRepository.getPostById(postId);
    if (!post) {
      // ✅ NEW: Log not found
      this.logger.debug('Post not found', { postId });
      throw new NotFoundException(ERROR_MESSAGES.POST.NOT_FOUND); // ✅ FIXED: Use constant
    }
    return post;
  }

  async getPublicPosts(limit: number = 10): Promise<Post[]> {
    // ✅ NEW: Log public posts fetch
    this.logger.debug('Fetching public posts', { limit });

    const posts = await this.postRepository.getPublicPosts(limit);

    // ✅ NEW: Log results
    this.logger.debug('Public posts retrieved', {
      postCount: posts.length,
      limit,
    });

    return posts;
  }

  async getPostsByUser(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<Post[]> {
    // CRITICAL: Ensure limit and offset are ALWAYS valid numbers
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

    // Final safety check - ensure we have valid integers
    safeLimit = Number.isInteger(safeLimit) && safeLimit > 0 ? safeLimit : 10;
    safeOffset = Number.isInteger(safeOffset) && safeOffset >= 0 ? safeOffset : 0;

    // ✅ NEW: Log user posts fetch
    this.logger.debug('Fetching posts by user', {
      userId,
      limit: safeLimit,
      offset: safeOffset,
      originalLimit: limit,
      originalOffset: offset,
    });

    const posts = await this.postRepository.getPostsByUserId(userId, safeLimit, safeOffset);

    // ✅ NEW: Log results
    this.logger.debug('User posts retrieved', {
      userId,
      postCount: posts.length,
    });

    return posts;
  }

  async getPostsByJourney(journeyId: string): Promise<Post[]> {
    this.logger.info('Fetching posts by journey', { journeyId });

    const posts = await this.postRepository.getPostsByJourneyId(journeyId);

    this.logger.info('Journey posts retrieved', {
      journeyId,
      postCount: posts.length,
    });

    return posts;
  }

  async getPostCountByUser(userId: string): Promise<number> {
    const count = await this.postRepository.getPostCountByUserId(userId);

    // ✅ NEW: Log count
    this.logger.debug('Post count retrieved', {
      userId,
      count,
    });

    return count;
  }

  async deletePost(postId: string, user: User): Promise<void> {
    const post = await this.postRepository.getPostById(postId);
    if (!post) {
      // ✅ NEW: Log not found
      this.logger.warn('Post not found for deletion', {
        postId,
        userId: user.id,
      });
      throw new NotFoundException(ERROR_MESSAGES.POST.NOT_FOUND); // ✅ FIXED: Use constant
    }

    if (post.user.id !== user.id) {
      // ✅ NEW: Log permission denied
      this.logger.warn('Unauthorized deletion attempt', {
        postId,
        userId: user.id,
        postOwnerId: post.user.id,
      });
      throw new BadRequestException(ERROR_MESSAGES.POST.PERMISSION_DENIED); // ✅ FIXED: Use constant
    }

    // ✅ NEW: Log deletion
    this.logger.info('Deleting post', {
      postId,
      userId: user.id,
    });

    await this.postRepository.deletePost(postId);

    // ✅ NEW: Log success
    this.logger.info('Post deleted successfully', {
      postId,
      userId: user.id,
    });
  }

  async updatePost(
    postId: string,
    user: User,
    updatePostDto: CreatePostDto,
  ): Promise<Post> {
    const post = await this.postRepository.getPostById(postId);
    if (!post) {
      // ✅ NEW: Log not found
      this.logger.warn('Post not found for update', {
        postId,
        userId: user.id,
      });
      throw new NotFoundException(ERROR_MESSAGES.POST.NOT_FOUND); // ✅ FIXED: Use constant
    }

    if (post.user.id !== user.id) {
      // ✅ NEW: Log permission denied
      this.logger.warn('Unauthorized update attempt', {
        postId,
        userId: user.id,
        postOwnerId: post.user.id,
      });
      throw new BadRequestException(ERROR_MESSAGES.POST.PERMISSION_DENIED); // ✅ FIXED: Use constant
    }

    // ✅ NEW: Log update
    this.logger.info('Updating post', {
      postId,
      userId: user.id,
      hasDescription: !!updatePostDto.description,
      hasLocation: !!updatePostDto.location,
    });

    const updatedPost = await this.postRepository.updatePost(postId, updatePostDto);

    // ✅ NEW: Log success
    this.logger.info('Post updated successfully', {
      postId,
      userId: user.id,
    });

    return updatedPost;
  }

  async likePost(postId: string, user: User): Promise<LikeResponseDto> {
    // Use lightweight query - only fetch id and likeCount
    const post = await this.postRepository.getPostForLikeOperation(postId);
    if (!post) {
      throw new NotFoundException(ERROR_MESSAGES.POST.NOT_FOUND);
    }

    const result = await this.postRepository.likePost(post, user);

    // Minimal logging for performance
    this.logger.debug('Post liked', { postId, userId: user.id });

    return result;
  }

  async unlikePost(postId: string, user: User): Promise<LikeResponseDto> {
    // Use lightweight query - only fetch id and likeCount
    const post = await this.postRepository.getPostForLikeOperation(postId);
    if (!post) {
      throw new NotFoundException(ERROR_MESSAGES.POST.NOT_FOUND);
    }

    const result = await this.postRepository.unlikePost(post, user);

    // Minimal logging for performance
    this.logger.debug('Post unliked', { postId, userId: user.id });

    return result;
  }

  async addComment(
    postId: string,
    user: User,
    content: string,
    parentId?: string,
  ): Promise<PostComment> {
    const post = await this.postRepository.getPostById(postId);
    if (!post) {
      // ✅ NEW: Log not found
      this.logger.warn('Post not found for comment', {
        postId,
        userId: user.id,
      });
      throw new NotFoundException(ERROR_MESSAGES.POST.NOT_FOUND); // ✅ FIXED: Use constant
    }

    let parentComment: PostComment | undefined;
    if (parentId) {
      const comments = await this.postRepository.getComments(postId);
      parentComment = comments.find((comment) => comment.id === parentId);
      if (!parentComment) {
        // ✅ NEW: Log parent comment not found
        this.logger.warn('Parent comment not found', {
          postId,
          parentId,
          userId: user.id,
        });
        throw new NotFoundException(ERROR_MESSAGES.COMMENT.PARENT_NOT_FOUND); // ✅ FIXED: Use constant
      }
    }

    // ✅ NEW: Log comment addition
    this.logger.info('Adding comment to post', {
      postId,
      userId: user.id,
      isReply: !!parentId,
      contentLength: content?.length,
    });

    const comment = await this.postRepository.addComment(post, user, content, parentComment);

    // ✅ NEW: Log success
    this.logger.info('Comment added successfully', {
      commentId: comment.id,
      postId,
      userId: user.id,
      isReply: !!parentId,
    });

    return comment;
  }

  async deleteComment(commentId: string, user: User): Promise<void> {
    const comments = await this.postRepository.getComments(commentId);
    const comment = comments[0];
    if (!comment) {
      // ✅ NEW: Log not found
      this.logger.warn('Comment not found for deletion', {
        commentId,
        userId: user.id,
      });
      throw new NotFoundException(ERROR_MESSAGES.COMMENT.NOT_FOUND); // ✅ FIXED: Use constant
    }

    if (comment.user.id !== user.id) {
      // ✅ NEW: Log permission denied
      this.logger.warn('Unauthorized comment deletion attempt', {
        commentId,
        userId: user.id,
        commentOwnerId: comment.user.id,
      });
      throw new BadRequestException(ERROR_MESSAGES.COMMENT.PERMISSION_DENIED); // ✅ FIXED: Use constant
    }

    // ✅ NEW: Log deletion
    this.logger.info('Deleting comment', {
      commentId,
      userId: user.id,
    });

    await this.postRepository.deleteComment(comment);

    // ✅ NEW: Log success
    this.logger.info('Comment deleted successfully', {
      commentId,
      userId: user.id,
    });
  }

  async getComments(
    postId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<PostComment[]> {
    const post = await this.postRepository.getPostById(postId);
    if (!post) {
      // ✅ NEW: Log not found
      this.logger.debug('Post not found for comments fetch', { postId });
      throw new NotFoundException(ERROR_MESSAGES.POST.NOT_FOUND); // ✅ FIXED: Use constant
    }

    // ✅ NEW: Log comments fetch
    this.logger.debug('Fetching comments for post', {
      postId,
      limit,
      offset,
    });

    const comments = await this.postRepository.getComments(postId, limit, offset);

    // ✅ NEW: Log results
    this.logger.debug('Comments retrieved', {
      postId,
      commentCount: comments.length,
    });

    return comments;
  }

  async getReplies(
    commentId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<PostComment[]> {
    // ✅ NEW: Log replies fetch
    this.logger.debug('Fetching comment replies', {
      commentId,
      limit,
      offset,
    });

    const replies = await this.postRepository.getReplies(commentId, limit, offset);

    // ✅ NEW: Log results
    this.logger.debug('Replies retrieved', {
      commentId,
      replyCount: replies.length,
    });

    return replies;
  }

  async uploadPostMedia(userId: string, file: Express.Multer.File): Promise<string> { // ✅ FIXED: Type-safe
    // ✅ NEW: Log media upload
    this.logger.info('Uploading post media via service', {
      userId,
      fileName: file.originalname,
      fileSize: file.size,
    });

    // Upload to S3 using the same pattern as profile images
    const url = await this.s3Service.uploadFile(file, 'posts', userId);

    // ✅ NEW: Log success
    this.logger.info('Post media uploaded via service', {
      userId,
      url,
    });

    return url;
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
    // ✅ NEW: Log dashboard fetch
    this.logger.debug('Fetching dashboard posts', {
      cursor,
      limit,
      location,
      search,
    });

    const result = await this.postRepository.getDashboardPosts(
      cursor,
      limit,
      location,
      search,
    );

    // ✅ NEW: Log results
    this.logger.debug('Dashboard posts retrieved', {
      postCount: result.posts.length,
      hasMore: result.hasMore,
      totalCount: result.totalCount,
    });

    return result;
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
    // ✅ NEW: Log dashboard fetch with user context
    this.logger.debug('Fetching dashboard posts with user likes', {
      userId,
      cursor,
      limit,
      location,
      search,
    });

    const result = await this.postRepository.getDashboardPostsWithUserLikes(
      userId,
      cursor,
      limit,
      location,
      search,
    );

    // ✅ NEW: Log results
    this.logger.debug('Dashboard posts with likes retrieved', {
      userId,
      postCount: result.posts.length,
      hasMore: result.hasMore,
      totalCount: result.totalCount,
    });

    return result;
  }
}
