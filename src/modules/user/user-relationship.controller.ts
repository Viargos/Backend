import { Controller, Post, Delete, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/security/jwt-auth.guard';
import { UserRelationshipService } from './user-relationship.service';
import { FollowUserDto } from './dto/follow-user.dto';
import { User } from './entities/user.entity';

@ApiTags('User Relationships')
@Controller('users/relationships')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserRelationshipController {
  constructor(private readonly userRelationshipService: UserRelationshipService) {}

  @Post('follow')
  @ApiOperation({ summary: 'Follow a user' })
  @ApiResponse({ status: 200, description: 'Successfully followed user' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async followUser(
    @Request() req: { user: User },
    @Body() followUserDto: FollowUserDto,
  ) {
    return this.userRelationshipService.followUser(req.user.id, followUserDto);
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
    return this.userRelationshipService.unfollowUser(req.user.id, userId);
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
} 