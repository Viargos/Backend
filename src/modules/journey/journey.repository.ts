import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Journey } from './entities/journey.entity';
import { CreateJourneyDto } from './dto/create-journey.dto';

@Injectable()
export class JourneyRepository {
  constructor(
    @InjectRepository(Journey)
    private readonly journeyRepo: Repository<Journey>,
  ) {}

  async createJourney(createJourneyDto: CreateJourneyDto): Promise<Journey> {
    const journey = this.journeyRepo.create(createJourneyDto);
    return await this.journeyRepo.save(journey);
  }

  async findOneById(id: string): Promise<Journey> {
    return await this.journeyRepo.findOne({ where: { id }, relations: ['days', 'days.places'] });
  }

  async findAll(): Promise<Journey[]> {
    return await this.journeyRepo.find({ relations: ['days', 'days.places'] });
  }

  async updateJourney(id: string, updateJourneyDto: CreateJourneyDto): Promise<Journey> {
    await this.journeyRepo.update(id, updateJourneyDto);
    return this.findOneById(id);
  }

  async removeJourney(id: string): Promise<void> {
    await this.journeyRepo.delete(id);
  }
}
