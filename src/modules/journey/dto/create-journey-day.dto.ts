import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateJourneyDayPlaceDto } from './create-journey-day-place.dto';

export class CreateJourneyDayDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  dayNumber: number;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  date: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [CreateJourneyDayPlaceDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateJourneyDayPlaceDto)
  places: CreateJourneyDayPlaceDto[];
}
