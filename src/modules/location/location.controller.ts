import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LocationService } from './location.service';
import { CurrentLocationResponseDto } from './dto/current-location.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('location')
@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('current')
  @Public()
  @ApiOperation({
    summary: 'Get current location based on IP address',
    description:
      'Returns approximate location based on the client IP address. Useful as a fallback when browser geolocation is not available.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current location retrieved successfully',
    type: CurrentLocationResponseDto,
  })
  getCurrentLocation(@Request() req): CurrentLocationResponseDto {
    return this.locationService.getCurrentLocation(req);
  }
}

