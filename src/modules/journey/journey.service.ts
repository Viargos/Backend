import { Injectable, NotFoundException } from '@nestjs/common';
import { JourneyRepository } from './journey.repository';
import { Journey } from './entities/journey.entity';
import { CreateJourneyDto } from './dto/create-journey.dto';
import { UpdateJourneyDto } from './dto/update-journey.dto';
import { NearbyJourneysDto } from './dto/nearby-journeys.dto';
import { S3Service } from '../user/s3.service';

@Injectable()
export class JourneyService {
  constructor(
    private readonly journeyRepository: JourneyRepository,
    private readonly s3Service: S3Service,
  ) {}

  async create(createJourneyDto: CreateJourneyDto): Promise<Journey> {
    return this.journeyRepository.createJourney(createJourneyDto);
  }

  async findAll(): Promise<Journey[]> {
    return this.journeyRepository.findAll();
  }

  async findByUser(userId: string): Promise<Journey[]> {
    return this.journeyRepository.findByUser(userId);
  }

  async findOne(id: string): Promise<Journey> {
    const journey = await this.journeyRepository.findOneById(id);
    if (!journey) {
      throw new NotFoundException('Journey not found');
    }
    return journey;
  }

  async update(
    id: string,
    updateJourneyDto: UpdateJourneyDto,
  ): Promise<Journey> {
    const journey = await this.journeyRepository.findOneById(id);
    if (!journey) {
      throw new NotFoundException('Journey not found');
    }
    return this.journeyRepository.updateJourney(id, updateJourneyDto);
  }

  async uploadCoverImage(userId: string, file: Express.Multer.File): Promise<string> {
    return this.s3Service.uploadJourneyPhoto(file, userId);
  }

  async uploadPlaceMedia(userId: string, file: Express.Multer.File): Promise<string> {
    return this.s3Service.uploadJourneyPhoto(file, userId);
  }

  async remove(id: string): Promise<void> {
    const journey = await this.journeyRepository.findOneById(id);
    // Make deletion idempotent: if journey doesn't exist, treat it as already deleted
    if (!journey) {
      return; // Journey already deleted or doesn't exist - consider it successful
    }
    return this.journeyRepository.removeJourney(id);
  }

  async getJourneyCountByUser(userId: string): Promise<number> {
    return this.journeyRepository.getJourneyCountByUser(userId);
  }

  async getPopularJourneys(
    currentUserId: string,
    limit: number = 3,
  ): Promise<Array<{
    coverImage?: string;
    createdAt: string;
    creator: {
      id: string;
      username: string;
    };
    daysCount: number;
    description?: string;
    id: string;
    placesCount: number;
    title: string;
  }>> {
    return this.journeyRepository.getPopularJourneys(currentUserId, limit);
  }

  async findNearby(nearbyDto: NearbyJourneysDto): Promise<Journey[]> {
    return this.journeyRepository.findNearbyJourneys(
      nearbyDto.latitude,
      nearbyDto.longitude,
      nearbyDto.radius || 10,
      nearbyDto.limit || 20,
    );
  }
}
