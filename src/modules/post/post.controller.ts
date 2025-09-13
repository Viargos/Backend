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
import { Post as PostEntity } from './entities/post.entity';
import { PostMedia } from './entities/post-media.entity';
import { PostComment } from './entities/post-comment.entity';
import { JwtAuthGuard } from 'src/security/jwt-auth.guard';
import { User } from '../user/entities/user.entity';

@ApiTags('posts')
@Controller('posts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
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
    return this.postService.createPost(req.user, createPostDto);
  }

  @Post(':postId/media')
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
    return this.postService.addMediaToPost(req.user, postId, addMediaDto);
  }

  @Post('media')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload media for posts' })
  @ApiResponse({
    status: 201,
    description: 'Media uploaded successfully',
  })
  async uploadPostMedia(
    @Request() req,
    @UploadedFile() file: any,
  ): Promise<{ imageUrl: string; message: string }> {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const imageUrl = await this.postService.uploadPostMedia(req.user.id, file);
    return {
      imageUrl,
      message: 'Media uploaded successfully',
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
    return this.postService.getPost(postId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get posts by user ID' })
  @ApiResponse({
    status: 200,
    description: 'Posts retrieved successfully',
    type: [PostEntity],
  })
  async getPostsByUser(
    @Param('userId') userId: string,
    @Request() req,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<PostEntity[]> {
    // Handle "me" as current user
    const targetUserId = userId === 'me' ? req.user.id : userId;
    return this.postService.getPostsByUser(targetUserId, limit, offset);
  }

  @Get('user/:userId/count')
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
    const count = await this.postService.getPostCountByUser(targetUserId);
    return { count };
  }

  @Post(':postId/like')
  @ApiOperation({ summary: 'Like a post' })
  @ApiResponse({ status: 200, description: 'Post liked successfully' })
  async likePost(
    @Request() req,
    @Param('postId') postId: string,
  ): Promise<void> {
    return this.postService.likePost(postId, req.user);
  }

  @Delete(':postId/like')
  @ApiOperation({ summary: 'Unlike a post' })
  @ApiResponse({ status: 200, description: 'Post unliked successfully' })
  async unlikePost(
    @Request() req,
    @Param('postId') postId: string,
  ): Promise<void> {
    return this.postService.unlikePost(postId, req.user);
  }

  @Post(':postId/comments')
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
    return this.postService.addComment(postId, req.user, content, parentId);
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  async deleteComment(
    @Request() req,
    @Param('commentId') commentId: string,
  ): Promise<void> {
    return this.postService.deleteComment(commentId, req.user);
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
    return this.postService.getComments(postId, limit, offset);
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
    return this.postService.getReplies(commentId, limit, offset);
  }
}
