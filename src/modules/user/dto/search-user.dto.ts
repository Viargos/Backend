import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SearchUserDto {
  @ApiProperty({
    description: 'Search term to search across username, email, bio, and location',
    required: false,
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter by username (exact match or partial)',
    required: false,
    example: 'john_doe',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({
    description: 'Filter by email (exact match or partial)',
    required: false,
    example: 'user@example.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: 'Filter by location (partial match)',
    required: false,
    example: 'New York',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Filter by active status',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isActive?: boolean;

  @ApiProperty({
    description: 'Page number (starting from 1)',
    required: false,
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page (max 100)',
    required: false,
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    description: 'Sort by field',
    required: false,
    example: 'createdAt',
    default: 'createdAt',
    enum: ['username', 'email', 'createdAt', 'updatedAt'],
  })
  @IsOptional()
  @IsString()
  sortBy?: 'username' | 'email' | 'createdAt' | 'updatedAt' = 'createdAt';

  @ApiProperty({
    description: 'Sort order',
    required: false,
    example: 'DESC',
    default: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export interface SearchUserResult {
  users: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
