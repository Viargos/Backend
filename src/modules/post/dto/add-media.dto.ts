import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { MediaType } from '../entities/post-media.entity';

export class AddMediaDto {
  @ApiProperty({
    description: 'Type of media (image or video)',
    enum: MediaType,
    example: MediaType.IMAGE,
  })
  @IsEnum(MediaType)
  @IsNotEmpty({ message: 'Media type is required' })
  type: MediaType;

  @ApiProperty({
    description: 'URL of the media file in S3',
    example: 'https://your-bucket.s3.amazonaws.com/posts/123/image.jpg',
  })
  @IsString()
  @IsNotEmpty({ message: 'Media URL is required' })
  url: string;

  @ApiProperty({
    description: 'Thumbnail URL for videos',
    example: 'https://your-bucket.s3.amazonaws.com/posts/123/thumbnail.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiProperty({
    description: 'Duration of video in seconds',
    example: 30,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  duration?: number;

  @ApiProperty({
    description: 'Order of media in the post',
    example: 0,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  order?: number;
} 