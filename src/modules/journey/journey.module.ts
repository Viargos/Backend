import { Module, forwardRef } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Journey } from './entities/journey.entity';
import { JourneyDay } from './entities/journey-day.entity';
import { JourneyDayPlace } from './entities/journey-day-place.entity';
import { JourneyController } from './journey.controller';
import { JourneyService } from './journey.service';
import { JourneyRepository } from './journey.repository';
import { GeoIndexService } from './geo/geo-index.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Journey, JourneyDay, JourneyDayPlace]),
    MulterModule.register({
      storage: memoryStorage(),
    }),
    forwardRef(() => UserModule),
  ],
  controllers: [JourneyController],
  providers: [JourneyService, JourneyRepository, GeoIndexService],
  exports: [JourneyService],
})
export class JourneyModule {}
