import {
  BadRequestException,
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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
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

// ✅ NEW: Import logger and constants
import { Logger } from '../../common/utils';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../common/constants';

@ApiTags('journeys')
@Controller('journeys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JourneyController {
  // ✅ NEW: Add logger
  private readonly logger = Logger.child({
    service: 'JourneyController',
  });

  constructor(private readonly journeyService: JourneyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new journey' })
  @ApiResponse({
    status: 201,
    description: 'Journey created successfully',
    type: Journey,
  })
  async create(
    @Request() req,
    @Body() createJourneyDto: CreateJourneyDto,
  ): Promise<Journey> {
    createJourneyDto.user = req.user;

    // ✅ NEW: Log journey creation
    this.logger.info('Creating new journey', {
      userId: req.user.id,
      title: createJourneyDto.title,
      hasDescription: !!createJourneyDto.description,
      dayCount: createJourneyDto.days?.length || 0,
    });

    const journey = await this.journeyService.create(createJourneyDto);

    // ✅ NEW: Log success
    this.logger.info('Journey created successfully', {
      journeyId: journey.id,
      userId: req.user.id,
      title: journey.title,
    });

    return journey;
  }

  @Post('cover-image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload journey cover image' })
  @ApiResponse({
    status: 201,
    description: 'Journey cover image uploaded successfully',
  })
  async uploadJourneyCoverImage(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ data: { imageUrl: string; message: string } }> {
    if (!file) {
      this.logger.warn('Journey cover upload failed: No file provided', {
        userId: req.user.id,
      });
      throw new BadRequestException(ERROR_MESSAGES.FILE.NO_FILE_PROVIDED);
    }

    this.logger.info('Uploading journey cover image', {
      userId: req.user.id,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    });

    const imageUrl = await this.journeyService.uploadCoverImage(req.user.id, file);

    this.logger.info('Journey cover image uploaded successfully', {
      userId: req.user.id,
      imageUrl,
    });

    return {
      data: {
        imageUrl,
        message: SUCCESS_MESSAGES.FILE.UPLOAD_SUCCESS,
      },
    };
  }

  @Post('place-media')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload media for a journey place' })
  @ApiResponse({
    status: 201,
    description: 'Journey place media uploaded successfully',
  })
  async uploadJourneyPlaceMedia(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ data: { imageUrl: string; message: string } }> {
    if (!file) {
      this.logger.warn('Journey place media upload failed: No file provided', {
        userId: req.user.id,
      });
      throw new BadRequestException(ERROR_MESSAGES.FILE.NO_FILE_PROVIDED);
    }

    this.logger.info('Uploading journey place media', {
      userId: req.user.id,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    });

    const imageUrl = await this.journeyService.uploadPlaceMedia(req.user.id, file);

    this.logger.info('Journey place media uploaded successfully', {
      userId: req.user.id,
      imageUrl,
    });

    return {
      data: {
        imageUrl,
        message: SUCCESS_MESSAGES.FILE.UPLOAD_SUCCESS,
      },
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all journeys' })
  @ApiResponse({
    status: 200,
    description: 'Journeys retrieved successfully',
    type: [Journey],
  })
  async findAll(): Promise<Journey[]> {
    // ✅ NEW: Log journeys fetch
    this.logger.info('Fetching all journeys');

    const journeys = await this.journeyService.findAll();

    // ✅ NEW: Log success
    this.logger.info('Journeys retrieved', {
      journeyCount: journeys.length,
    });

    return journeys;
  }

  @Get('my-journeys')
  @ApiOperation({ summary: 'Get current user journeys' })
  @ApiResponse({
    status: 200,
    description: 'User journeys retrieved successfully',
    type: [Journey],
  })
  async findMyJourneys(@Request() req) {
    // ✅ NEW: Log user journeys fetch
    this.logger.info('Fetching user journeys', {
      userId: req.user.id,
    });

    const journeys = await this.journeyService.findByUser(req.user.id);

    // ✅ NEW: Log success
    this.logger.info('User journeys retrieved', {
      userId: req.user.id,
      journeyCount: journeys.length,
    });

    return {
      statusCode: 200,
      message: SUCCESS_MESSAGES.JOURNEY.CREATED, // ✅ FIXED: Use constant
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
    // ✅ NEW: Log nearby search
    this.logger.info('Searching nearby journeys', {
      latitude: nearbyDto.latitude,
      longitude: nearbyDto.longitude,
      radius: nearbyDto.radius,
    });

    const journeys = await this.journeyService.findNearby(nearbyDto);

    // ✅ NEW: Log results
    this.logger.info('Nearby journeys retrieved', {
      latitude: nearbyDto.latitude,
      longitude: nearbyDto.longitude,
      radius: nearbyDto.radius,
      journeyCount: journeys.length,
    });

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
  async findOne(@Param('id') id: string): Promise<Journey> {
    // ✅ NEW: Log journey fetch
    this.logger.info('Fetching journey by ID', {
      journeyId: id,
    });

    const journey = await this.journeyService.findOne(id);

    // ✅ NEW: Log success
    this.logger.info('Journey retrieved successfully', {
      journeyId: id,
      title: journey.title,
    });

    return journey;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a journey' })
  @ApiResponse({
    status: 200,
    description: 'Journey updated successfully',
    type: Journey,
  })
  async update(
    @Param('id') id: string,
    @Body() updateJourneyDto: UpdateJourneyDto,
  ): Promise<Journey> {
    // ✅ NEW: Log update attempt
    this.logger.info('Updating journey', {
      journeyId: id,
      fieldsToUpdate: Object.keys(updateJourneyDto),
    });

    const journey = await this.journeyService.update(id, updateJourneyDto);

    // ✅ NEW: Log success
    this.logger.info('Journey updated successfully', {
      journeyId: id,
      title: journey.title,
    });

    return journey;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a journey' })
  @ApiResponse({ status: 200, description: 'Journey deleted successfully' })
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    // ✅ NEW: Log deletion
    this.logger.info('Deleting journey', {
      journeyId: id,
    });

    try {
      await this.journeyService.remove(id);

      // ✅ NEW: Log success
      this.logger.info('Journey deleted successfully', {
        journeyId: id,
      });

      // Return proper JSON response to prevent frontend parsing errors
      return { success: true };
    } catch (error) {
      // Log error but don't let it affect session
      this.logger.error('Failed to delete journey', {
        journeyId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Re-throw to let NestJS exception handler deal with it properly
      throw error;
    }
  }
}
