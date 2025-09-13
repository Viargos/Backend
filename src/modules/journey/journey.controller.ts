import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JourneyService } from './journey.service';
import { Journey } from './entities/journey.entity';
import { JwtAuthGuard } from 'src/security/jwt-auth.guard';
import { CreateJourneyDto } from './dto/create-journey.dto';
import { UpdateJourneyDto } from './dto/update-journey.dto';
import { NearbyJourneysDto } from './dto/nearby-journeys.dto';

@ApiTags('journeys')
@Controller('journeys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JourneyController {
  constructor(private readonly journeyService: JourneyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new journey' })
  @ApiResponse({
    status: 201,
    description: 'Journey created successfully',
    type: Journey,
  })
  create(
    @Request() req,
    @Body() createJourneyDto: CreateJourneyDto,
  ): Promise<Journey> {
    createJourneyDto.user = req.user;
    return this.journeyService.create(createJourneyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all journeys' })
  @ApiResponse({
    status: 200,
    description: 'Journeys retrieved successfully',
    type: [Journey],
  })
  findAll(): Promise<Journey[]> {
    return this.journeyService.findAll();
  }

  @Get('my-journeys')
  @ApiOperation({ summary: 'Get current user journeys' })
  @ApiResponse({
    status: 200,
    description: 'User journeys retrieved successfully',
    type: [Journey],
  })
  async findMyJourneys(@Request() req) {
    const journeys = await this.journeyService.findByUser(req.user.id);
    return {
      statusCode: 200,
      message: 'User journeys retrieved successfully',
      data: journeys,
    };
  }

  @Get('nearby')
  @ApiOperation({
    summary: 'Find journeys nearby a specific location',
    description:
      'Search for journeys within a specified radius from given coordinates. Useful for discovering journeys in a specific area.',
  })
  @ApiResponse({
    status: 200,
    description: 'Nearby journeys retrieved successfully',
    type: [Journey],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid coordinates or radius provided',
  })
  async findNearbyJourneys(
    @Query() nearbyDto: NearbyJourneysDto,
  ): Promise<{ statusCode: number; message: string; data: Journey[] }> {
    const journeys = await this.journeyService.findNearby(nearbyDto);
    return {
      statusCode: 200,
      message: 'Nearby journeys retrieved successfully',
      data: journeys,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a journey by ID' })
  @ApiResponse({
    status: 200,
    description: 'Journey retrieved successfully',
    type: Journey,
  })
  findOne(@Param('id') id: string): Promise<Journey> {
    return this.journeyService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a journey' })
  @ApiResponse({
    status: 200,
    description: 'Journey updated successfully',
    type: Journey,
  })
  update(
    @Param('id') id: string,
    @Body() updateJourneyDto: UpdateJourneyDto,
  ): Promise<Journey> {
    return this.journeyService.update(id, updateJourneyDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a journey' })
  @ApiResponse({ status: 200, description: 'Journey deleted successfully' })
  remove(@Param('id') id: string): Promise<void> {
    return this.journeyService.remove(id);
  }
}
