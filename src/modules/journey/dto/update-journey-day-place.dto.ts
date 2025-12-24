import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateJourneyDayPlaceDto } from './create-journey-day-place.dto';
import { PlaceType } from '../entities/journey-day-place.entity';

export class UpdateJourneyDayPlaceDto extends PartialType(CreateJourneyDayPlaceDto) {
  @ApiProperty({ required: false, enum: PlaceType })
  type?: PlaceType;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false, description: 'Full address of the place' })
  address?: string;

  @ApiProperty({ required: false, description: 'Latitude coordinate', example: 40.7128 })
  latitude?: number;

  @ApiProperty({ required: false, description: 'Longitude coordinate', example: -74.006 })
  longitude?: number;

  @ApiProperty({ required: false })
  startTime?: string;

  @ApiProperty({ required: false })
  endTime?: string;
}
