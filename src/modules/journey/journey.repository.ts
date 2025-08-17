import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Journey } from './entities/journey.entity';
import { CreateJourneyDto } from './dto/create-journey.dto';
import { UpdateJourneyDto } from './dto/update-journey.dto';

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
    return await this.journeyRepo.findOne({
      where: { id },
      relations: ['days', 'days.places'],
    });
  }

  async findAll(): Promise<Journey[]> {
    return await this.journeyRepo.find({ relations: ['days', 'days.places'] });
  }

  async findByUser(userId: string): Promise<Journey[]> {
    return await this.journeyRepo.find({
      where: { user: { id: userId } },
      relations: ['days', 'days.places', 'user'],
      order: { createdAt: 'DESC' }, // Most recent first
    });
  }

  async updateJourney(
    id: string,
    updateJourneyDto: UpdateJourneyDto,
  ): Promise<Journey> {
    await this.journeyRepo.update(id, updateJourneyDto);
    return this.findOneById(id);
  }

  async removeJourney(id: string): Promise<void> {
    await this.journeyRepo.delete(id);
  }

  async getJourneyCountByUser(userId: string): Promise<number> {
    return await this.journeyRepo.count({
      where: { user: { id: userId } },
    });
  }
}
