import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/security/jwt-auth.guard';
import { UserRelationshipService } from './user-relationship.service';
import { FollowUserDto } from './dto/follow-user.dto';
import { User } from './entities/user.entity';

@ApiTags('User Relationships')
@Controller('users/relationships')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserRelationshipController {
  constructor(
    private readonly userRelationshipService: UserRelationshipService,
  ) {}

  @Post('follow')
  @ApiOperation({ summary: 'Follow a user' })
  @ApiResponse({ status: 200, description: 'Successfully followed user' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async followUser(
    @Request() req: { user: User },
    @Body() followUserDto: FollowUserDto,
  ) {
    return this.userRelationshipService.followUser(req.user, followUserDto);
  }

  @Delete('unfollow/:userId')
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiResponse({ status: 200, description: 'Successfully unfollowed user' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async unfollowUser(
    @Request() req: { user: User },
    @Param('userId') userId: string,
  ) {
    return this.userRelationshipService.unfollowUser(req.user, userId);
  }

  @Get('followers')
  @ApiOperation({ summary: 'Get user followers' })
  @ApiResponse({ status: 200, description: 'Returns list of followers' })
  async getFollowers(@Request() req: { user: User }) {
    return this.userRelationshipService.getFollowers(req.user.id);
  }

  @Get('following')
  @ApiOperation({ summary: 'Get users being followed' })
  @ApiResponse({ status: 200, description: 'Returns list of following users' })
  async getFollowing(@Request() req: { user: User }) {
    return this.userRelationshipService.getFollowing(req.user.id);
  }

  @Get(':userId/followers')
  @ApiOperation({ summary: 'Get followers of a specific user' })
  @ApiResponse({ status: 200, description: 'Returns list of followers' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserFollowers(@Param('userId') userId: string) {
    return this.userRelationshipService.getFollowers(userId);
  }

  @Get(':userId/following')
  @ApiOperation({ summary: 'Get users being followed by a specific user' })
  @ApiResponse({ status: 200, description: 'Returns list of following users' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserFollowing(@Param('userId') userId: string) {
    return this.userRelationshipService.getFollowing(userId);
  }

  @Get('followers/count')
  @ApiOperation({ summary: 'Get current user follower count' })
  @ApiResponse({ status: 200, description: 'Returns follower count' })
  async getFollowerCount(@Request() req: { user: User }) {
    const count = await this.userRelationshipService.getFollowerCount(
      req.user.id,
    );
    return { count };
  }

  @Get('following/count')
  @ApiOperation({ summary: 'Get current user following count' })
  @ApiResponse({ status: 200, description: 'Returns following count' })
  async getFollowingCount(@Request() req: { user: User }) {
    const count = await this.userRelationshipService.getFollowingCount(
      req.user.id,
    );
    return { count };
  }

  @Get(':userId/followers/count')
  @ApiOperation({ summary: 'Get follower count for a specific user' })
  @ApiResponse({ status: 200, description: 'Returns follower count' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserFollowerCount(@Param('userId') userId: string) {
    const count = await this.userRelationshipService.getFollowerCount(userId);
    return { count };
  }

  @Get(':userId/following/count')
  @ApiOperation({ summary: 'Get following count for a specific user' })
  @ApiResponse({ status: 200, description: 'Returns following count' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserFollowingCount(@Param('userId') userId: string) {
    const count = await this.userRelationshipService.getFollowingCount(userId);
    return { count };
  }
}
