import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignUpDto {
  @ApiProperty({
    example: 'john_doe',
    description:
      'Username must be 3-20 characters, alphanumeric with underscores',
  })
  @IsNotEmpty({ message: 'Username is required' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(20, { message: 'Username cannot exceed 20 characters' })
  readonly username: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Valid email address',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  readonly email: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'Optional phone number in E.164 format',
    required: false,
  })
  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  readonly phoneNumber?: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'Password must be 6-100 characters',
    minLength: 6,
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @MaxLength(100, { message: 'Password cannot exceed 100 characters' })
  readonly password: string;
}
