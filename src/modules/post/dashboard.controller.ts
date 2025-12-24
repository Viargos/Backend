import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PostService } from './post.service';
import { DashboardPostsDto } from './dto/dashboard-posts.dto';
import { Post as PostEntity } from './entities/post.entity';
import { JwtAuthGuard } from 'src/security/jwt-auth.guard';
import { DataResponse, StatusCode } from 'src/core/http/response';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly postService: PostService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get dashboard posts with cursor-based pagination for infinite scroll',
    description:
      'Fetches posts for dashboard with pagination support. Use cursor for infinite scroll. Perfect for mobile apps with scroll-to-load-more functionality.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard posts retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 10000 },
        message: {
          type: 'string',
          example: 'Dashboard posts retrieved successfully',
        },
        data: {
          type: 'object',
          properties: {
            posts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'uuid-string' },
                  description: {
                    type: 'string',
                    example: 'Amazing sunset at the beach!',
                  },
                  likeCount: { type: 'number', example: 42 },
                  commentCount: { type: 'number', example: 8 },
                  location: { type: 'string', example: 'Bali, Indonesia' },
                  latitude: { type: 'number', example: -8.3405 },
                  longitude: { type: 'number', example: 115.092 },
                  createdAt: { type: 'string', format: 'date-time' },
                  isLikedByUser: { type: 'boolean', example: true },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      username: { type: 'string' },
                      profileImage: { type: 'string', nullable: true },
                    },
                  },
                  media: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        type: { type: 'string', enum: ['image', 'video'] },
                        url: { type: 'string' },
                        thumbnailUrl: { type: 'string', nullable: true },
                      },
                    },
                  },
                  journey: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      id: { type: 'string' },
                      title: { type: 'string' },
                    },
                  },
                },
              },
            },
            hasMore: {
              type: 'boolean',
              example: true,
              description: 'Whether there are more posts to load',
            },
            nextCursor: {
              type: 'string',
              example: 'uuid-string',
              description:
                'Use this cursor for the next request to load more posts',
            },
            totalCount: {
              type: 'number',
              example: 150,
              description:
                'Total count (only provided on first request without cursor)',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  async getDashboardPosts(
    @Request() req,
    @Query() query: DashboardPostsDto,
  ): Promise<
    DataResponse<{
      posts: (PostEntity & { isLikedByUser?: boolean })[];
      hasMore: boolean;
      nextCursor?: string;
      totalCount: number;
    }>
  > {
    const result = await this.postService.getDashboardPostsWithUserLikes(
      req.user.id,
      query.cursor,
      query.limit || 20,
      query.location,
      query.search,
    );

    return new DataResponse(
      StatusCode.SUCCESS,
      'Dashboard posts retrieved successfully',
      {
        posts: result.posts,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        totalCount: result.totalCount,
      },
    );
  }
}
