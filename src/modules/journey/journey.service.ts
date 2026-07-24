import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from '../../common/constants';
import { JourneyRepository } from './journey.repository';
import { Journey } from './entities/journey.entity';
import { CreateJourneyDto } from './dto/create-journey.dto';
import { UpdateJourneyDto } from './dto/update-journey.dto';
import { NearbyJourneysDto } from './dto/nearby-journeys.dto';
import { S3Service } from '../user/s3.service';
import { User } from '../user/entities/user.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationEventType } from '../notification/notification.constants';

@Injectable()
export class JourneyService {
  constructor(
    private readonly journeyRepository: JourneyRepository,
    private readonly s3Service: S3Service,
    private readonly notificationService: NotificationService,
  ) {}

  async create(createJourneyDto: CreateJourneyDto): Promise<Journey> {
    const journey =
      await this.journeyRepository.createJourney(createJourneyDto);
    if (createJourneyDto.user?.id) {
      void this.notificationService
        .createEvent({
          dedupeKey: `journey-created:${journey.id}`,
          destinationUrl: `/journey/${encodeURIComponent(journey.id)}`,
          eventType: NotificationEventType.OPERATION_SUCCEEDED,
          userId: createJourneyDto.user.id,
          variables: { action: `Your journey “${journey.title}”` },
        })
        .catch(() => undefined);
    }
    return journey;
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
    user: User,
  ): Promise<Journey> {
    const journey = await this.journeyRepository.findOneById(id);
    if (!journey) {
      throw new NotFoundException(ERROR_MESSAGES.JOURNEY.NOT_FOUND);
    }

    if (!this.isJourneyOwner(journey, user)) {
      throw new ForbiddenException(ERROR_MESSAGES.JOURNEY.PERMISSION_DENIED);
    }

    const { createdById: _createdById, user: _user, userId: _userId, ...safeUpdateDto } = updateJourneyDto as UpdateJourneyDto & {
      createdById?: unknown;
      userId?: unknown;
    };

    const updatedJourney =
      await this.journeyRepository.updateJourney(id, safeUpdateDto);
    void this.notificationService
      .createEvent({
        dedupeKey: `journey-updated:${id}:${updatedJourney.updatedAt?.getTime() ?? Date.now()}`,
        destinationUrl: `/journey/${encodeURIComponent(id)}`,
        eventType: NotificationEventType.OPERATION_SUCCEEDED,
        userId: user.id,
        variables: { action: `Your journey “${updatedJourney.title}”` },
      })
      .catch(() => undefined);
    return updatedJourney;
  }

  async uploadCoverImage(userId: string, file: Express.Multer.File): Promise<string> {
    return this.s3Service.uploadJourneyPhoto(file, userId);
  }

  async uploadPlaceMedia(userId: string, file: Express.Multer.File): Promise<string> {
    return this.s3Service.uploadJourneyPhoto(file, userId);
  }

  async remove(id: string, user: User): Promise<void> {
    const journey = await this.journeyRepository.findOneById(id);
    if (!journey) {
      throw new NotFoundException(ERROR_MESSAGES.JOURNEY.NOT_FOUND);
    }

    if (!this.isJourneyOwner(journey, user)) {
      throw new ForbiddenException(ERROR_MESSAGES.JOURNEY.PERMISSION_DENIED);
    }

    return this.journeyRepository.removeJourney(id);
  }

  private isJourneyOwner(journey: Journey, user: User): boolean {
    const ownerId = journey.user?.id;
    const currentUserId = user?.id;

    return Boolean(ownerId && currentUserId && String(ownerId) === String(currentUserId));
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
