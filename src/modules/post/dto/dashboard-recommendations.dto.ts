import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class DashboardRecommendationsQueryDto {
  @ApiPropertyOptional({
    description: 'Number of recommended profiles to return (max 12)',
    example: 5,
    minimum: 1,
    maximum: 12,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(12)
  limit?: number = 5;

  @ApiPropertyOptional({
    description: 'Comma-separated profile IDs to exclude from the recommendation set',
    example: 'uuid-1,uuid-2',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value
        .flatMap(entry => String(entry).split(','))
        .map(entry => entry.trim())
        .filter(Boolean);
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map(entry => entry.trim())
        .filter(Boolean);
    }

    return [];
  })
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  excludeUserIds?: string[] = [];
}

export class DashboardRecommendationDto {
  @ApiProperty({ example: 'uuid-string' })
  id: string;

  @ApiProperty({ example: 'maya.chen' })
  username: string;

  @ApiProperty({ example: 'https://cdn.example.com/avatar.jpg', nullable: true })
  profileImage?: string | null;

  @ApiProperty({ example: 'Travel creator sharing slow living itineraries.' })
  descriptor: string;

  @ApiProperty({ example: 24800 })
  followersCount: number;

  @ApiProperty({ example: 42 })
  postsCount: number;

  @ApiProperty({ example: false })
  isFollowing: boolean;

  @ApiProperty({ example: 'Travel', required: false, nullable: true })
  category?: string;
}

export class DashboardRecommendationsResponseDto {
  @ApiProperty({
    type: [DashboardRecommendationDto],
  })
  profiles: DashboardRecommendationDto[];
}

export class DashboardJourneyRecommendationsQueryDto {
  @ApiPropertyOptional({
    description: 'Number of popular journeys to return (max 8)',
    example: 3,
    minimum: 1,
    maximum: 8,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(8)
  limit?: number = 3;
}

export class DashboardJourneyRecommendationCreatorDto {
  @ApiProperty({ example: 'uuid-string' })
  id: string;

  @ApiProperty({ example: 'maya.chen' })
  username: string;
}

export class DashboardJourneyRecommendationDto {
  @ApiProperty({ example: 'journey-id' })
  id: string;

  @ApiProperty({ example: 'South India Temple Trail' })
  title: string;

  @ApiProperty({ example: 'A compact cultural route across iconic temples.', required: false, nullable: true })
  description?: string | null;

  @ApiProperty({ example: 'https://cdn.example.com/cover.jpg', required: false, nullable: true })
  coverImage?: string | null;

  @ApiProperty({ type: DashboardJourneyRecommendationCreatorDto })
  creator: DashboardJourneyRecommendationCreatorDto;

  @ApiProperty({ example: 4 })
  daysCount: number;

  @ApiProperty({ example: 12 })
  placesCount: number;

  @ApiProperty({ example: '2026-04-03T10:00:00.000Z' })
  createdAt: string;
}

export class DashboardJourneyRecommendationsResponseDto {
  @ApiProperty({
    type: [DashboardJourneyRecommendationDto],
  })
  journeys: DashboardJourneyRecommendationDto[];
}
