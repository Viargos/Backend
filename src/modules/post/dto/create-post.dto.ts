import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
} from 'class-validator';

export class CreatePostDto {
  @ApiProperty({
    description: 'Post description',
    example: 'This is my first post!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  description: string;

  @ApiProperty({
    description: 'Journey ID to link this post with (optional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  journeyId?: string;

  @ApiProperty({
    description: 'Location name for standalone posts',
    example: 'Paris, France',
    required: false,
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    description: 'Latitude for location',
    example: 48.8566,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiProperty({
    description: 'Longitude for location',
    example: 2.3522,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  longitude?: number;
}
