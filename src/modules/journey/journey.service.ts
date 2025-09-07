import { Injectable, NotFoundException } from '@nestjs/common';
import { JourneyRepository } from './journey.repository';
import { Journey } from './entities/journey.entity';
import { CreateJourneyDto } from './dto/create-journey.dto';
import { UpdateJourneyDto } from './dto/update-journey.dto';
import { NearbyJourneysDto } from './dto/nearby-journeys.dto';

@Injectable()
export class JourneyService {
  constructor(private readonly journeyRepository: JourneyRepository) {}

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

  async remove(id: string): Promise<void> {
    const journey = await this.journeyRepository.findOneById(id);
    if (!journey) {
      throw new NotFoundException('Journey not found');
    }
    return this.journeyRepository.removeJourney(id);
  }

  async getJourneyCountByUser(userId: string): Promise<number> {
    return this.journeyRepository.getJourneyCountByUser(userId);
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
