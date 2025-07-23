import { Injectable, NotFoundException } from '@nestjs/common';
import { JourneyRepository } from './journey.repository';
import { Journey } from './entities/journey.entity';
import { CreateJourneyDto } from './dto/create-journey.dto';

@Injectable()
export class JourneyService {
  constructor(private readonly journeyRepository: JourneyRepository) {}

  async create(createJourneyDto: CreateJourneyDto): Promise<Journey> {
    return this.journeyRepository.createJourney(createJourneyDto);
  }

  async findAll(): Promise<Journey[]> {
    return this.journeyRepository.findAll();
  }

  async findOne(id: string): Promise<Journey> {
    const journey = await this.journeyRepository.findOneById(id);
    if (!journey) {
      throw new NotFoundException('Journey not found');
    }
    return journey;
  }

  async update(id: string, updateJourneyDto: CreateJourneyDto): Promise<Journey> {
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
}
