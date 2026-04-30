import { Controller, Get, Query, UseGuards, Request, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PostService } from './post.service';
import { DashboardPostsDto } from './dto/dashboard-posts.dto';
import {
  DashboardRecommendationsQueryDto,
  DashboardRecommendationsResponseDto,
  DashboardJourneyRecommendationsQueryDto,
  DashboardJourneyRecommendationsResponseDto,
} from './dto/dashboard-recommendations.dto';
import { Post as PostEntity } from './entities/post.entity';
import { JwtAuthGuard } from 'src/security/jwt-auth.guard';
import { DataResponse, StatusCode } from 'src/core/http/response';
import { UserService } from '../user/user.service';
import { JourneyService } from '../journey/journey.service';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(
    private readonly postService: PostService,
    private readonly userService: UserService,
    private readonly journeyService: JourneyService,
  ) {}

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
    if (process.env.NODE_ENV !== 'production') {
      const cookieHeader = typeof req.headers?.cookie === 'string' ? req.headers.cookie : '';
      this.logger.debug('Dashboard cookie header received', {
        cookiePreview: cookieHeader.slice(0, 80),
        hasAccessToken: cookieHeader.includes('viargos_access_token='),
      });
    }

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

  @Get('recommendations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get recommended profiles for the dashboard right rail',
    description:
      'Returns a lightweight list of popular profiles that the current user is not already following.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard profile recommendations retrieved successfully',
    type: DashboardRecommendationsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  async getDashboardRecommendations(
    @Request() req,
    @Query() query: DashboardRecommendationsQueryDto,
  ): Promise<DataResponse<DashboardRecommendationsResponseDto>> {
    const profiles = await this.userService.getDashboardRecommendations(req.user.id, {
      excludeUserIds: query.excludeUserIds,
      limit: query.limit || 5,
    });

    return new DataResponse(
      StatusCode.SUCCESS,
      'Dashboard recommendations retrieved successfully',
      { profiles },
    );
  }

  @Get('popular-journeys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get popular journeys for the dashboard right rail',
    description:
      'Returns a lightweight list of high-signal journeys for dashboard discovery.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard journey recommendations retrieved successfully',
    type: DashboardJourneyRecommendationsResponseDto,
  })
  async getPopularJourneys(
    @Request() req,
    @Query() query: DashboardJourneyRecommendationsQueryDto,
  ): Promise<DataResponse<DashboardJourneyRecommendationsResponseDto>> {
    const journeys = await this.journeyService.getPopularJourneys(
      req.user.id,
      query.limit || 3,
    );

    return new DataResponse(
      StatusCode.SUCCESS,
      'Dashboard journey recommendations retrieved successfully',
      { journeys },
    );
  }
}
