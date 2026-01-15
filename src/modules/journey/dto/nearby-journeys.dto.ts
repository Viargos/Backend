import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class NearbyJourneysDto {
  @ApiProperty({
    description: 'Latitude coordinate',
    example: 23.0225,
    minimum: -90,
    maximum: 90,
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: 72.5714,
    minimum: -180,
    maximum: 180,
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({
    description: 'Search radius in kilometers',
    example: 500,
    minimum: 0.1,
    maximum: 20000, // Increased for global discovery (half of Earth's circumference)
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0.1)
  @Max(20000)
  radius?: number = 500; // Default 500km radius

  @ApiProperty({
    description: 'Maximum number of results to return',
    example: 20,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20; // Default 20 results
}
