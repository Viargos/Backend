import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { PlaceType } from '../entities/journey-day-place.entity';

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

  @ApiProperty({ required: false })
  @IsOptional()
  startTime?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  endTime?: string;
}
