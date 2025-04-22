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
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserDto } from './dto/user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/security/jwt-auth.guard';

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
}
