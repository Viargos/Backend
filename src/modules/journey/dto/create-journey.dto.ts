import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateJourneyDayDto } from './create-journey-day.dto';
import { User } from '../../user/entities/user.entity';

export class CreateJourneyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: [CreateJourneyDayDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateJourneyDayDto)
  days: CreateJourneyDayDto[];

  user: User;
}
