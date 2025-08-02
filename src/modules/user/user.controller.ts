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
    return await this.userService.findUsers(query);
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

  @Get(':id')
  @ApiOperation({
    summary: 'Find user by ID',
    description: 'Returns a single user by ID',
  })
  async getUserById(@Param('id') id: string): Promise<UserDto> {
    const user = await this.userService.findUserById(id);
    return new UserDto(user);
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
    @UploadedFile() file: Express.Multer.File,
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
    @UploadedFile() file: Express.Multer.File,
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
