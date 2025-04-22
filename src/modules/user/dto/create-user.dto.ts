import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { User } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({
    example: 'john_doe',
    description: 'Unique username',
  })
  @IsString()
  @IsNotEmpty()
  readonly username: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  @IsNotEmpty()
  readonly email: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'User phone number (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly phoneNumber?: string;

  @ApiProperty({
    example: 'test@123',
    description: 'Password',
  })
  @IsString()
  @IsNotEmpty()
  readonly password: string;
}
