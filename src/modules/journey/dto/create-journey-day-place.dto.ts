import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PlaceType } from '../entities/journey-day-place.entity';
import { JourneyMediaType } from '../entities/journey-media.entity';

export class CreateJourneyMediaDto {
  @ApiProperty({ enum: JourneyMediaType })
  @IsEnum(JourneyMediaType)
  type: JourneyMediaType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiProperty({ required: false, description: 'Duration in seconds (for videos)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  duration?: number;

  @ApiProperty({ required: false, description: 'Display order for this media item' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  order?: number;
}

export class CreateJourneyDayPlaceDto {
  @ApiProperty({ enum: PlaceType })
  @IsEnum(PlaceType)
  type: PlaceType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, description: 'Full address of the place' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false, description: 'Latitude coordinate', example: 40.7128 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @ApiProperty({ required: false, description: 'Longitude coordinate', example: -74.006 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  startTime?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  endTime?: string;

  @ApiProperty({
    required: false,
    type: [CreateJourneyMediaDto],
    description:
      'Optional media items (images/videos) associated with this place. If omitted, the place will have no media.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateJourneyMediaDto)
  @IsOptional()
  media?: CreateJourneyMediaDto[];
}
