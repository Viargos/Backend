import { ApiProperty } from '@nestjs/swagger';

export class CurrentLocationResponseDto {
  @ApiProperty({
    description: 'Latitude of the current location',
    example: 40.7128,
  })
  latitude: number;

  @ApiProperty({
    description: 'Longitude of the current location',
    example: -74.006,
  })
  longitude: number;

  @ApiProperty({
    description: 'City name',
    example: 'New York',
    required: false,
  })
  city?: string;

  @ApiProperty({
    description: 'Country name',
    example: 'United States',
    required: false,
  })
  country?: string;

  @ApiProperty({
    description: 'Region/State name',
    example: 'New York',
    required: false,
  })
  region?: string;
}

