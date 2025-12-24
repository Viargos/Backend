import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  ParseEnumPipe,
  Body,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
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
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/security/jwt-auth.guard';
import { User } from './entities/user.entity';

// ✅ NEW: Import logger and constants
import { Logger } from '../../common/utils';
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  S3_CONFIG,
} from '../../common/constants';
import { FileUploadFolder } from '../../common/enums';
import { S3Service } from './s3.service';

@ApiBearerAuth()
@ApiTags('User')
class DeleteMediaDto {
  fileUrlOrKey: string;
}

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  // ✅ NEW: Add logger
  private readonly logger = Logger.child({
    service: 'UserController',
  });

  constructor(
    private readonly userService: UserService,
    private readonly s3Service: S3Service,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Find users',
    description: 'Returns all users based on optional filters',
  })
  async getUsers(@Query() query: Partial<UserDto>): Promise<UserDto[]> {
    // ✅ NEW: Log user search
    this.logger.info('Fetching users with filters', {
      filters: Object.keys(query),
    });

    const users = await this.userService.findUsers(query);

    // ✅ NEW: Log success
    this.logger.info('Users retrieved', {
      userCount: users.length,
    });

    return users.map(user => new UserDto(user));
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search users with advanced options',
    description: 'Search users with pagination, sorting, and filtering options. Supports search across username, email, bio, and location.',
  })
  async searchUsers(@Query() searchDto: SearchUserDto): Promise<SearchUserResult> {
    // ✅ NEW: Log search request
    this.logger.info('Searching users with advanced options', {
      searchTerm: searchDto.search,
      page: searchDto.page,
      limit: searchDto.limit,
      sortBy: searchDto.sortBy,
    });

    const result = await this.userService.searchUsers(searchDto);
    // Convert users to DTOs to exclude sensitive information like passwords
    const userDtos = result.users.map(user => new UserDto(user));

    // ✅ NEW: Log results
    this.logger.info('User search completed', {
      resultCount: userDtos.length,
      total: result.total,
      page: result.page,
    });

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

    // ✅ NEW: Log quick search
    this.logger.info('Quick search users', {
      searchTerm,
      limit: limit || 10,
    });

    const users = await this.userService.searchUsersByTerm(
      searchTerm,
      limit ? Number(limit) : 10,
    );

    // ✅ NEW: Log results
    this.logger.info('Quick search completed', {
      searchTerm,
      resultCount: users.length,
    });

    return users.map(user => new UserDto(user));
  }

  @Get('profile-image-url')
  @ApiOperation({ summary: 'Get profile image URL' })
  async getProfileImageUrl(
    @Request() req: { user: User },
  ): Promise<{ imageUrl: string }> {
    // ✅ NEW: Log request
    this.logger.debug('Fetching profile image URL', {
      userId: req.user.id,
    });

    const user = await this.userService.findUserById(req.user.id);
    if (!user?.profileImage) {
      // ✅ FIXED: Use proper exception with ERROR_MESSAGES
      this.logger.warn('Profile image not found', {
        userId: req.user.id,
      });
      throw new NotFoundException(ERROR_MESSAGES.FILE.NO_FILE_PROVIDED);
    }

    // Return the direct S3 URL since images are now public
    return { imageUrl: user.profileImage };
  }

  @Get('banner-image-url')
  @ApiOperation({ summary: 'Get banner image URL' })
  async getBannerImageUrl(
    @Request() req: { user: User },
  ): Promise<{ imageUrl: string }> {
    // ✅ NEW: Log request
    this.logger.debug('Fetching banner image URL', {
      userId: req.user.id,
    });

    const user = await this.userService.findUserById(req.user.id);
    if (!user?.bannerImage) {
      // ✅ FIXED: Use proper exception with ERROR_MESSAGES
      this.logger.warn('Banner image not found', {
        userId: req.user.id,
      });
      throw new NotFoundException(ERROR_MESSAGES.FILE.NO_FILE_PROVIDED);
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
    // ✅ NEW: Log profile request
    this.logger.info('Fetching comprehensive profile', {
      userId: req.user.id,
    });

    const profile = await this.userService.getUserProfile(req.user.id, req.user.id);

    // ✅ NEW: Log success
    this.logger.info('Profile retrieved', {
      userId: req.user.id,
    });

    return profile;
  }

  @Get(':id/basic')
  @ApiOperation({
    summary: 'Get basic user info by ID',
    description: 'Returns basic user information without posts, journeys, or relationships',
  })
  async getBasicUserById(@Param('id') id: string): Promise<UserDto> {
    // ✅ NEW: Log request
    this.logger.debug('Fetching basic user info', {
      userId: id,
    });

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
    // ✅ NEW: Log request
    this.logger.info('Fetching user profile by ID', {
      targetUserId: id,
      requestedBy: req.user.id,
      basicOnly: basic === 'true',
    });

    if (basic === 'true') {
      const user = await this.userService.findUserById(id);
      return new UserDto(user);
    }

    const profile = await this.userService.getUserProfile(id, req.user.id);

    // ✅ NEW: Log success
    this.logger.info('User profile retrieved', {
      targetUserId: id,
      requestedBy: req.user.id,
    });

    return profile;
  }

  @Post()
  @ApiOperation({ summary: 'Create user', description: 'Creates a new user' })
  async createUser(@Body() createUserDto: CreateUserDto): Promise<UserDto> {
    // ✅ NEW: Log user creation
    this.logger.info('Creating new user', {
      username: createUserDto.username,
      email: createUserDto.email,
    });

    const user = await this.userService.createUser(createUserDto);

    // ✅ NEW: Log success
    this.logger.info('User created successfully', {
      userId: user.id,
      username: user.username,
    });

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
    // ✅ NEW: Log update
    this.logger.info('Updating user', {
      userId: id,
      fieldsToUpdate: Object.keys(updateUserDto),
    });

    const updatedUser = await this.userService.updateUser(id, updateUserDto);

    // ✅ NEW: Log success
    this.logger.info('User updated successfully', {
      userId: id,
    });

    return new UserDto(updatedUser);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user', description: 'Deletes a user by ID' })
  async deleteUser(@Param('id') id: string) {
    // ✅ NEW: Log deletion
    this.logger.info('Deleting user', {
      userId: id,
    });

    const result = await this.userService.deleteUser(id);

    // ✅ NEW: Log success
    this.logger.info('User deleted successfully', {
      userId: id,
    });

    return result;
  }

  @Post('profile-image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload profile image' })
  async uploadProfileImage(
    @Request() req: { user: User },
    @UploadedFile() file: Express.Multer.File, // ✅ FIXED: Type-safe instead of any
  ): Promise<UploadImageResponseDto> {
    // ✅ FIXED: Use BadRequestException with ERROR_MESSAGES
    if (!file) {
      this.logger.warn('Profile image upload failed: No file provided', {
        userId: req.user.id,
      });
      throw new BadRequestException(ERROR_MESSAGES.FILE.NO_FILE_PROVIDED);
    }

    // ✅ NEW: Log upload attempt
    this.logger.info('Uploading profile image', {
      userId: req.user.id,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    });

    const imageUrl = await this.userService.uploadProfileImage(
      req.user.id,
      file,
    );

    // ✅ NEW: Log success
    this.logger.info('Profile image uploaded successfully', {
      userId: req.user.id,
      imageUrl,
    });

    return {
      imageUrl,
      message: SUCCESS_MESSAGES.USER.IMAGE_UPLOADED, // ✅ FIXED: Use constant
    };
  }

  @Post('banner-image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload banner image' })
  async uploadBannerImage(
    @Request() req: { user: User },
    @UploadedFile() file: Express.Multer.File, // ✅ FIXED: Type-safe instead of any
  ): Promise<UploadImageResponseDto> {
    // ✅ FIXED: Use BadRequestException with ERROR_MESSAGES
    if (!file) {
      this.logger.warn('Banner image upload failed: No file provided', {
        userId: req.user.id,
      });
      throw new BadRequestException(ERROR_MESSAGES.FILE.NO_FILE_PROVIDED);
    }

    // ✅ NEW: Log upload attempt
    this.logger.info('Uploading banner image', {
      userId: req.user.id,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    });

    const imageUrl = await this.userService.uploadBannerImage(
      req.user.id,
      file,
    );

    // ✅ NEW: Log success
    this.logger.info('Banner image uploaded successfully', {
      userId: req.user.id,
      imageUrl,
    });

    return {
      imageUrl,
      message: SUCCESS_MESSAGES.USER.IMAGE_UPLOADED, // ✅ FIXED: Use constant
    };
  }

  @Post('upload-url')
  @ApiOperation({
    summary: 'Generate a pre-signed S3 URL for direct image upload',
    description:
      'Returns a pre-signed URL and final file URL so the client can upload directly to S3 using PUT. Supports images (jpg, jpeg, png, webp).',
  })
  async getUploadUrl(
    @Request() req: { user: User },
    @Body()
    body: {
      fileName: string;
      contentType: string;
      folder?: FileUploadFolder | string;
    },
  ): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
    const { fileName, contentType, folder } = body;

    if (!fileName || !contentType) {
      this.logger.warn('Upload URL request missing fileName or contentType', {
        userId: req.user.id,
      });
      throw new BadRequestException(ERROR_MESSAGES.FILE.NO_FILE_PROVIDED);
    }

    // Basic server-side guard: only allow common image MIME types here
    const allowedImageTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ];

    if (!allowedImageTypes.includes(contentType)) {
      this.logger.warn('Disallowed content type for upload URL', {
        userId: req.user.id,
        contentType,
      });
      throw new BadRequestException('Unsupported image content type');
    }

    // Default folder to POSTS if not provided
    const targetFolder =
      folder && typeof folder === 'string'
        ? folder
        : S3_CONFIG.FOLDERS.POSTS;

    const result = await this.userService.getUploadSignedUrl({
      userId: req.user.id,
      fileName,
      contentType,
      folder: targetFolder,
    });

    this.logger.info('Generated upload URL', {
      userId: req.user.id,
      key: result.key,
    });

    return result;
  }

  @Delete('media')
  @ApiOperation({
    summary: 'Delete a media file from S3',
    description:
      'Deletes a media file given its full URL or S3 object key. Requires authentication.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fileUrlOrKey: {
          type: 'string',
          description:
            'Full S3 URL (https://bucket.s3.region.amazonaws.com/key) or S3 object key',
        },
      },
      required: ['fileUrlOrKey'],
    },
  })
  async deleteMedia(
    @Request() req: { user: User },
    @Body() body: DeleteMediaDto,
  ): Promise<{ success: boolean }> {
    const { fileUrlOrKey } = body;

    if (!fileUrlOrKey || !fileUrlOrKey.trim()) {
      this.logger.warn('Media delete failed: No file URL or key provided', {
        userId: req.user.id,
      });
      throw new BadRequestException(ERROR_MESSAGES.FILE.NO_FILE_PROVIDED);
    }

    this.logger.info('Deleting media file from S3', {
      userId: req.user.id,
      fileUrlPreview: fileUrlOrKey.substring(0, 120),
    });

    await this.s3Service.deleteFile(fileUrlOrKey);

    this.logger.info('Media file deleted successfully', {
      userId: req.user.id,
    });

    return { success: true };
  }
}
