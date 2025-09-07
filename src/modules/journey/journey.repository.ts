import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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

  async findNearbyJourneys(
    latitude: number,
    longitude: number,
    radiusKm: number,
    limit: number,
  ): Promise<Journey[]> {
    // Using the Haversine formula to calculate distance
    // 6371 is Earth's radius in kilometers
    const query = `
      SELECT DISTINCT j.*, u.id as user_id, u.username, u.email, u."profileImage", u.bio, u.location
      FROM journey j
      INNER JOIN "user" u ON j."userId" = u.id
      INNER JOIN journey_day jd ON jd."journeyId" = j.id
      INNER JOIN journey_day_place jdp ON jdp."journeyDayId" = jd.id
      WHERE jdp.latitude IS NOT NULL 
        AND jdp.longitude IS NOT NULL
        AND (
          6371 * acos(
            cos(radians($1)) * cos(radians(jdp.latitude)) *
            cos(radians(jdp.longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(jdp.latitude))
          )
        ) <= $3
      ORDER BY j."createdAt" DESC
      LIMIT $4
    `;

    const rawResults = await this.journeyRepo.query(query, [
      latitude,
      longitude,
      radiusKm,
      limit,
    ]);

    // Transform raw results to Journey entities with user info
    const journeyIds = rawResults.map((row) => row.id);
    
    if (journeyIds.length === 0) {
      return [];
    }

    return await this.journeyRepo.find({
      where: { id: In(journeyIds) },
      relations: ['user', 'days', 'days.places'],
      order: { createdAt: 'DESC' },
    });
  }
}
