import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class DashboardPostsDto {
  @ApiPropertyOptional({
    description: 'Cursor for pagination (ID of the last post from previous request)',
    example: 'uuid-string',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Number of posts per page (max 50)',
    example: 20,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by location (optional)',
    example: 'New York',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Search in post descriptions (optional)',
    example: 'travel',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class DashboardPostsResponseDto {
  posts: any[];
  hasMore: boolean;
  nextCursor?: string;
  totalCount?: number;
}
