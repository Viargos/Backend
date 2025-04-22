import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { User } from '../entities/user.entity';

export class UserDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique user ID (UUID)',
  })
  @IsUUID()
  readonly id: string;

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
    example: '2025-03-04T12:00:00Z',
    description: 'User creation timestamp',
  })
  readonly createdAt: Date;

  @ApiProperty({
    example: '2025-03-05T12:00:00Z',
    description: 'User last update timestamp',
  })
  readonly updatedAt: Date;

  constructor(user: User) {
    this.id = user.id;
    this.username = user.username;
    this.email = user.email;
    this.phoneNumber = user.phoneNumber;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }
}
