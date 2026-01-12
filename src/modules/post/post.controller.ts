import {
  Controller,
  Get,
  Post as HttpPost,
  Body,
  Param,
  Delete,
  Patch,
  Query,
  UseGuards,
  Request,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { AddMediaDto } from './dto/add-media.dto';
import { DashboardPostsDto } from './dto/dashboard-posts.dto';
import { LikeResponseDto } from './dto/like-response.dto';
import { Post as PostEntity } from './entities/post.entity';
import { PostMedia } from './entities/post-media.entity';
import { PostComment } from './entities/post-comment.entity';
import { JwtAuthGuard } from 'src/security/jwt-auth.guard';
import { User } from '../user/entities/user.entity';

// ✅ NEW: Import logger and constants
import { Logger } from '../../common/utils';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../common/constants';

@ApiTags('posts')
@Controller('posts')
export class PostController {
  // ✅ NEW: Add logger
  private readonly logger = Logger.child({
    service: 'PostController',
  });

  constructor(private readonly postService: PostService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new post' })
  @ApiResponse({
    status: 201,
    description: 'Post created successfully',
    type: PostEntity,
  })
  async createPost(
    @Request() req,
    @Body() createPostDto: CreatePostDto,
  ): Promise<PostEntity> {
    // ✅ NEW: Log post creation
    this.logger.info('Creating new post', {
      userId: req.user.id,
      hasDescription: !!createPostDto.description,
      hasLocation: !!createPostDto.location,
    });

    const post = await this.postService.createPost(req.user, createPostDto);

    // ✅ NEW: Log success
    this.logger.info('Post created successfully', {
      postId: post.id,
      userId: req.user.id,
    });

    return post;
  }

  @Post(':postId/media')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add media to a post' })
  @ApiResponse({
    status: 201,
    description: 'Media added successfully',
    type: PostMedia,
  })
  async addMediaToPost(
    @Request() req,
    @Param('postId') postId: string,
    @Body() addMediaDto: AddMediaDto,
  ): Promise<PostMedia> {
    // ✅ NEW: Log media addition
    this.logger.info('Adding media to post', {
      postId,
      userId: req.user.id,
      mediaType: addMediaDto.type,
    });

    const media = await this.postService.addMediaToPost(
      req.user,
      postId,
      addMediaDto,
    );

    // ✅ NEW: Log success
    this.logger.info('Media added to post successfully', {
      postId,
      mediaId: media.id,
      userId: req.user.id,
    });

    return media;
  }

  @Post('media')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload media for posts' })
  @ApiResponse({
    status: 201,
    description: 'Media uploaded successfully',
  })
  async uploadPostMedia(
    @Request() req,
    @UploadedFile() file: Express.Multer.File, // ✅ FIXED: Type-safe instead of any
  ): Promise<{ imageUrl: string; message: string }> {
    // ✅ FIXED: Use BadRequestException with ERROR_MESSAGES
    if (!file) {
      this.logger.warn('Upload failed: No file provided', {
        userId: req.user.id,
      });
      throw new BadRequestException(ERROR_MESSAGES.FILE.NO_FILE_PROVIDED);
    }

    // ✅ NEW: Log upload attempt
    this.logger.info('Uploading post media', {
      userId: req.user.id,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    });

    const imageUrl = await this.postService.uploadPostMedia(req.user.id, file);

    // ✅ NEW: Log success
    this.logger.info('Post media uploaded successfully', {
      userId: req.user.id,
      imageUrl,
    });

    return {
      imageUrl,
      message: SUCCESS_MESSAGES.FILE.UPLOAD_SUCCESS, // ✅ FIXED: Use constant
    };
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get dashboard posts with cursor-based pagination for infinite scroll',
    description:
      'Fetches posts for dashboard with pagination support. Use cursor for infinite scroll.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard posts retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: {
          type: 'string',
          example: 'Dashboard posts retrieved successfully',
        },
        data: {
          type: 'object',
          properties: {
            posts: {
              type: 'array',
              items: { type: 'object' },
            },
            hasMore: { type: 'boolean', example: true },
            nextCursor: { type: 'string', example: 'uuid-string' },
            totalCount: { type: 'number', example: 150 },
          },
        },
      },
    },
  })
  async getDashboardPosts(
    @Request() req,
    @Query() query: DashboardPostsDto,
  ): Promise<{
    statusCode: number;
    message: string;
    data: {
      posts: (PostEntity & { isLikedByCurrentUser?: boolean })[];
      hasMore: boolean;
      nextCursor?: string;
      totalCount: number;
    };
  }> {
    // ✅ NEW: Log dashboard request
    this.logger.info('Fetching dashboard posts', {
      userId: req.user.id,
      cursor: query.cursor,
      limit: query.limit || 20,
      location: query.location,
      search: query.search,
    });

    const result = await this.postService.getDashboardPostsWithUserLikes(
      req.user.id,
      query.cursor,
      query.limit || 20,
      query.location,
      query.search,
    );

    // ✅ NEW: Log success
    this.logger.info('Dashboard posts retrieved', {
      userId: req.user.id,
      postCount: result.posts.length,
      hasMore: result.hasMore,
      totalCount: result.totalCount,
    });

    return {
      statusCode: 200,
      message: SUCCESS_MESSAGES.POST.FETCH_SUCCESS, // ✅ FIXED: Use constant
      data: result,
    };
  }

  @Get('public')
  @ApiOperation({ summary: 'Get public posts for guest users' })
  @ApiResponse({
    status: 200,
    description: 'Public posts retrieved successfully',
    type: [PostEntity],
  })
  async getPublicPosts(
    @Query('limit') limit?: number,
  ): Promise<{ statusCode: number; message: string; data: PostEntity[] }> {
    // ✅ NEW: Log public posts request
    this.logger.info('Fetching public posts', {
      limit: limit || 10,
    });

    const posts = await this.postService.getPublicPosts(limit || 10);

    // ✅ NEW: Log success
    this.logger.info('Public posts retrieved', {
      postCount: posts.length,
    });

    return {
      statusCode: 200,
      message: SUCCESS_MESSAGES.POST.FETCH_SUCCESS, // ✅ FIXED: Use constant
      data: posts,
    };
  }

  @Get(':postId')
  @ApiOperation({ summary: 'Get a post by ID' })
  @ApiResponse({
    status: 200,
    description: 'Post retrieved successfully',
    type: PostEntity,
  })
  async getPost(@Param('postId') postId: string): Promise<PostEntity> {
    // ✅ NEW: Log post fetch
    this.logger.info('Fetching post by ID', {
      postId,
    });

    const post = await this.postService.getPost(postId);

    // ✅ NEW: Log success
    this.logger.info('Post retrieved successfully', {
      postId,
    });

    return post;
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get posts by user ID' })
  @ApiResponse({
    status: 200,
    description: 'Posts retrieved successfully',
    type: [PostEntity],
  })
  async getPostsByUser(
    @Param('userId') userId: string,
    @Request() req,
    @Query('limit') limit?: string | number,
    @Query('offset') offset?: string | number,
  ): Promise<PostEntity[]> {
    // Handle "me" as current user
    const targetUserId = userId === 'me' ? req.user.id : userId;

    // Parse and validate limit and offset
    // If undefined, null, empty string, or "undefined", use defaults
    let parsedLimit: number = 10; // default
    let parsedOffset: number = 0; // default

    // Handle limit
    if (limit !== undefined && limit !== null && limit !== '') {
      if (typeof limit === 'string') {
        // Check for string "undefined" or invalid values
        if (limit !== 'undefined' && limit !== 'null') {
          const limitNum = parseInt(limit, 10);
          if (!isNaN(limitNum) && limitNum > 0) {
            parsedLimit = limitNum;
          }
        }
      } else if (typeof limit === 'number' && !isNaN(limit) && limit > 0) {
        parsedLimit = limit;
      }
    }

    // Handle offset
    if (offset !== undefined && offset !== null && offset !== '') {
      if (typeof offset === 'string') {
        // Check for string "undefined" or invalid values
        if (offset !== 'undefined' && offset !== 'null') {
          const offsetNum = parseInt(offset, 10);
          if (!isNaN(offsetNum) && offsetNum >= 0) {
            parsedOffset = offsetNum;
          }
        }
      } else if (typeof offset === 'number' && !isNaN(offset) && offset >= 0) {
        parsedOffset = offset;
      }
    }

    // ✅ NEW: Log user posts fetch
    this.logger.info('Fetching posts by user', {
      targetUserId,
      requestedBy: req.user.id,
      limit: parsedLimit,
      offset: parsedOffset,
    });

    // Final safety check - ensure we're passing valid numbers
    const finalLimit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;
    const finalOffset = Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

    const posts = await this.postService.getPostsByUser(
      targetUserId,
      finalLimit,
      finalOffset,
    );

    // ✅ NEW: Log success
    this.logger.info('User posts retrieved', {
      targetUserId,
      postCount: posts.length,
    });

    return posts;
  }

  @Get('user/:userId/count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get post count by user ID' })
  @ApiResponse({
    status: 200,
    description: 'Post count retrieved successfully',
  })
  async getPostCountByUser(
    @Param('userId') userId: string,
    @Request() req,
  ): Promise<{ count: number }> {
    // Handle "me" as current user
    const targetUserId = userId === 'me' ? req.user.id : userId;

    // ✅ NEW: Log count request
    this.logger.debug('Fetching post count by user', {
      targetUserId,
      requestedBy: req.user.id,
    });

    const count = await this.postService.getPostCountByUser(targetUserId);

    return { count };
  }

  @Delete(':postId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a post' })
  @ApiResponse({ status: 200, description: 'Post deleted successfully' })
  async deletePost(
    @Request() req,
    @Param('postId') postId: string,
  ): Promise<{ statusCode: number; message: string }> {
    // ✅ NEW: Log delete attempt
    this.logger.info('Deleting post', {
      postId,
      userId: req.user.id,
    });

    await this.postService.deletePost(postId, req.user);

    // ✅ NEW: Log success
    this.logger.info('Post deleted successfully', {
      postId,
      userId: req.user.id,
    });

    return {
      statusCode: 200,
      message: SUCCESS_MESSAGES.POST.DELETED, // ✅ FIXED: Use constant
    };
  }

  @Patch(':postId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a post' })
  @ApiResponse({
    status: 200,
    description: 'Post updated successfully',
    type: PostEntity,
  })
  async updatePost(
    @Request() req,
    @Param('postId') postId: string,
    @Body() updatePostDto: CreatePostDto,
  ): Promise<{ statusCode: number; message: string; data: PostEntity }> {
    // ✅ NEW: Log update attempt
    this.logger.info('Updating post', {
      postId,
      userId: req.user.id,
      hasDescription: !!updatePostDto.description,
      hasLocation: !!updatePostDto.location,
    });

    const updatedPost = await this.postService.updatePost(
      postId,
      req.user,
      updatePostDto,
    );

    // ✅ NEW: Log success
    this.logger.info('Post updated successfully', {
      postId,
      userId: req.user.id,
    });

    return {
      statusCode: 200,
      message: SUCCESS_MESSAGES.POST.UPDATED, // ✅ FIXED: Use constant
      data: updatedPost,
    };
  }

  @Post(':postId/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a post' })
  @ApiResponse({ status: 200, description: 'Post liked successfully' })
  async likePost(
    @Request() req,
    @Param('postId') postId: string,
  ): Promise<LikeResponseDto> {
    // ✅ NEW: Log like operation
    this.logger.debug('Liking post', {
      postId,
      userId: req.user.id,
    });

    const result = await this.postService.likePost(postId, req.user);

    // ✅ NEW: Log success
    this.logger.debug('Post liked successfully', {
      postId,
      userId: req.user.id,
      likeCount: result.likeCount,
    });

    return result;
  }

  @Delete(':postId/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlike a post' })
  @ApiResponse({ status: 200, description: 'Post unliked successfully' })
  async unlikePost(
    @Request() req,
    @Param('postId') postId: string,
  ): Promise<LikeResponseDto> {
    // ✅ NEW: Log unlike operation
    this.logger.debug('Unliking post', {
      postId,
      userId: req.user.id,
    });

    const result = await this.postService.unlikePost(postId, req.user);

    // ✅ NEW: Log success
    this.logger.debug('Post unliked successfully', {
      postId,
      userId: req.user.id,
      likeCount: result.likeCount,
    });

    return result;
  }

  @Post(':postId/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a comment to a post' })
  @ApiResponse({
    status: 201,
    description: 'Comment added successfully',
    type: PostComment,
  })
  async addComment(
    @Request() req,
    @Param('postId') postId: string,
    @Body('content') content: string,
    @Body('parentId') parentId?: string,
  ): Promise<PostComment> {
    // ✅ NEW: Log comment addition
    this.logger.info('Adding comment to post', {
      postId,
      userId: req.user.id,
      isReply: !!parentId,
      contentLength: content?.length,
    });

    const comment = await this.postService.addComment(
      postId,
      req.user,
      content,
      parentId,
    );

    // ✅ NEW: Log success
    this.logger.info('Comment added successfully', {
      commentId: comment.id,
      postId,
      userId: req.user.id,
      isReply: !!parentId,
    });

    return comment;
  }

  @Delete('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  async deleteComment(
    @Request() req,
    @Param('commentId') commentId: string,
  ): Promise<void> {
    // ✅ NEW: Log comment deletion
    this.logger.info('Deleting comment', {
      commentId,
      userId: req.user.id,
    });

    await this.postService.deleteComment(commentId, req.user);

    // ✅ NEW: Log success
    this.logger.info('Comment deleted successfully', {
      commentId,
      userId: req.user.id,
    });
  }

  @Get(':postId/comments')
  @ApiOperation({ summary: 'Get comments for a post' })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully',
    type: [PostComment],
  })
  async getComments(
    @Param('postId') postId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<PostComment[]> {
    // ✅ NEW: Log comments fetch
    this.logger.debug('Fetching comments for post', {
      postId,
      limit,
      offset,
    });

    const comments = await this.postService.getComments(postId, limit, offset);

    // ✅ NEW: Log success
    this.logger.debug('Comments retrieved', {
      postId,
      commentCount: comments.length,
    });

    return comments;
  }

  @Get('comments/:commentId/replies')
  @ApiOperation({ summary: 'Get replies to a comment' })
  @ApiResponse({
    status: 200,
    description: 'Replies retrieved successfully',
    type: [PostComment],
  })
  async getReplies(
    @Param('commentId') commentId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<PostComment[]> {
    // ✅ NEW: Log replies fetch
    this.logger.debug('Fetching replies to comment', {
      commentId,
      limit,
      offset,
    });

    const replies = await this.postService.getReplies(commentId, limit, offset);

    // ✅ NEW: Log success
    this.logger.debug('Replies retrieved', {
      commentId,
      replyCount: replies.length,
    });

    return replies;
  }
}
