import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  Body,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { UserDto } from './dto/user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UploadImageResponseDto } from './dto/upload-image.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { SearchUserDto, SearchUserResult } from './dto/search-user.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/security/jwt-auth.guard';
import { User } from './entities/user.entity';

@ApiBearerAuth()
@ApiTags('User')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({
    summary: 'Find users',
    description: 'Returns all users based on optional filters',
  })
  async getUsers(@Query() query: Partial<UserDto>): Promise<UserDto[]> {
    const users = await this.userService.findUsers(query);
    return users.map(user => new UserDto(user));
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search users with advanced options',
    description: 'Search users with pagination, sorting, and filtering options. Supports search across username, email, bio, and location.',
  })
  async searchUsers(@Query() searchDto: SearchUserDto): Promise<SearchUserResult> {
    const result = await this.userService.searchUsers(searchDto);
    // Convert users to DTOs to exclude sensitive information like passwords
    const userDtos = result.users.map(user => new UserDto(user));
    
    return {
      ...result,
      users: userDtos,
    };
  }

  @Get('search/quick')
  @ApiOperation({
    summary: 'Quick search users',
    description: 'Quick search users by a search term with a limit. Returns up to specified number of results.',
  })
  async quickSearchUsers(
    @Query('q') searchTerm: string,
    @Query('limit') limit?: number,
  ): Promise<UserDto[]> {
    if (!searchTerm) {
      return [];
    }
    
    const users = await this.userService.searchUsersByTerm(
      searchTerm,
      limit ? Number(limit) : 10,
    );
    
    return users.map(user => new UserDto(user));
  }

  @Get('profile-image-url')
  @ApiOperation({ summary: 'Get profile image URL' })
  async getProfileImageUrl(
    @Request() req: { user: User },
  ): Promise<{ imageUrl: string }> {
    const user = await this.userService.findUserById(req.user.id);
    if (!user?.profileImage) {
      throw new Error('No profile image found');
    }

    // Return the direct S3 URL since images are now public
    return { imageUrl: user.profileImage };
  }

  @Get('banner-image-url')
  @ApiOperation({ summary: 'Get banner image URL' })
  async getBannerImageUrl(
    @Request() req: { user: User },
  ): Promise<{ imageUrl: string }> {
    const user = await this.userService.findUserById(req.user.id);
    if (!user?.bannerImage) {
      throw new Error('No banner image found');
    }

    // Return the direct S3 URL since images are now public
    return { imageUrl: user.bannerImage };
  }

  @Get('profile/me')
  @ApiOperation({
    summary: 'Get comprehensive user profile',
    description: 'Returns detailed user profile with followers, following, posts, journeys and statistics'
  })
  async getComprehensiveProfile(
    @Request() req: { user: User }
  ): Promise<UserProfileResponseDto> {
    return await this.userService.getUserProfile(req.user.id, req.user.id);
  }

  @Get(':id/basic')
  @ApiOperation({
    summary: 'Get basic user info by ID',
    description: 'Returns basic user information without posts, journeys, or relationships',
  })
  async getBasicUserById(@Param('id') id: string): Promise<UserDto> {
    const user = await this.userService.findUserById(id);
    return new UserDto(user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get comprehensive user profile by ID',
    description: 'Returns complete user profile with all details including posts, journeys, followers, following, and statistics. Use ?basic=true for basic info only.',
  })
  async getUserById(
    @Param('id') id: string,
    @Request() req: { user: User },
    @Query('basic') basic?: string
  ): Promise<UserProfileResponseDto | UserDto> {
    if (basic === 'true') {
      const user = await this.userService.findUserById(id);
      return new UserDto(user);
    }
    
    return await this.userService.getUserProfile(id, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create user', description: 'Creates a new user' })
  async createUser(@Body() createUserDto: CreateUserDto): Promise<UserDto> {
    const user = await this.userService.createUser(createUserDto);
    return new UserDto(user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update user',
    description: 'Updates an existing user',
  })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserDto> {
    const updatedUser = await this.userService.updateUser(id, updateUserDto);
    return new UserDto(updatedUser);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user', description: 'Deletes a user by ID' })
  async deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }

  @Post('profile-image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload profile image' })
  async uploadProfileImage(
    @Request() req: { user: User },
    @UploadedFile() file: any,
  ): Promise<UploadImageResponseDto> {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const imageUrl = await this.userService.uploadProfileImage(
      req.user.id,
      file,
    );
    return {
      imageUrl,
      message: 'Profile image uploaded successfully',
    };
  }

  @Post('banner-image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload banner image' })
  async uploadBannerImage(
    @Request() req: { user: User },
    @UploadedFile() file: any,
  ): Promise<UploadImageResponseDto> {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const imageUrl = await this.userService.uploadBannerImage(
      req.user.id,
      file,
    );
    return {
      imageUrl,
      message: 'Banner image uploaded successfully',
    };
  }
}
