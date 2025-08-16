import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateJourneyDto } from './create-journey.dto';

export class UpdateJourneyDto extends PartialType(CreateJourneyDto) {
  @ApiProperty({ required: false })
  title?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false, description: 'Cover image URL for the journey' })
  coverImage?: string;

  @ApiProperty({ required: false })
  days?: any[];
}
