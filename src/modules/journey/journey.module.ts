import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Journey } from './entities/journey.entity';
import { JourneyDay } from './entities/journey-day.entity';
import { JourneyDayPlace } from './entities/journey-day-place.entity';
import { JourneyController } from './journey.controller';
import { JourneyService } from './journey.service';
import { JourneyRepository } from './journey.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Journey, JourneyDay, JourneyDayPlace])],
  controllers: [JourneyController],
  providers: [JourneyService, JourneyRepository],
})
export class JourneyModule {}
