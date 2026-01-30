import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Journey } from './entities/journey.entity';
import { CreateJourneyDto } from './dto/create-journey.dto';
import { UpdateJourneyDto } from './dto/update-journey.dto';
import { JourneyMediaType } from './entities/journey-media.entity';

@Injectable()
export class JourneyRepository {
  constructor(
    @InjectRepository(Journey)
    private readonly journeyRepo: Repository<Journey>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async createJourney(createJourneyDto: CreateJourneyDto): Promise<Journey> {
    console.log('[JOURNEY_CREATE] Incoming DTO:', JSON.stringify(createJourneyDto));

    const transformedDto: CreateJourneyDto = {
      ...createJourneyDto,
      days: createJourneyDto.days?.map((day, dayIndex) => {
        console.log('[JOURNEY_CREATE] Processing day', {
          dayIndex,
          dayNumber: day.dayNumber,
          placeCount: day.places?.length || 0,
        });

        return {
          ...day,
          places: day.places?.map((place, placeIndex) => {
            const anyPlace = place as any;
            const photos: string[] = anyPlace.photos || anyPlace.images || [];
            const explicitMedia = Array.isArray(anyPlace.media) ? anyPlace.media : [];

            console.log('[JOURNEY_CREATE] Place media payload', {
              dayIndex,
              placeIndex,
              placeName: place.name,
              photosCount: photos?.length || 0,
              explicitMediaCount: explicitMedia.length,
            });

            const mediaFromPhotos =
              Array.isArray(photos) && photos.length > 0
                ? photos.map((url, index) => ({
                    type: JourneyMediaType.IMAGE,
                    url,
                    order: index,
                  }))
                : [];

            const combinedMedia = [...explicitMedia, ...mediaFromPhotos];

            console.log('[JOURNEY_CREATE] Combined media entities (pre-create)', {
              dayIndex,
              placeIndex,
              placeName: place.name,
              mediaCount: combinedMedia.length,
            });

            // Strip out legacy image fields so they don't end up on the entity
            const { photos: _photos, images: _images, ...rest } = anyPlace;

            return {
              ...rest,
              media: combinedMedia.length > 0 ? combinedMedia : undefined,
            };
          }) || [],
        };
      }) || [],
    };

    console.log('[JOURNEY_CREATE] Transformed DTO with media:', JSON.stringify(transformedDto));

    try {
      const journey = this.journeyRepo.create(
        transformedDto as any,
      ) as unknown as Journey;
      console.log('[JOURNEY_CREATE] Journey entity before save:', {
        hasDays: !!journey.days,
        dayCount: journey.days?.length || 0,
      });

      const saved = (await this.journeyRepo.save(journey)) as Journey;

      console.log('[JOURNEY_CREATE] Journey saved successfully', {
        journeyId: saved.id,
        dayCount: saved.days?.length || 0,
      });

      return saved;
    } catch (error) {
      console.error('[JOURNEY_CREATE] Failed to save journey with media', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async findOneById(id: string): Promise<Journey> {
    console.log('[JOURNEY_FETCH] findOneById called', { journeyId: id });

    const journey = await this.journeyRepo.findOne({
      where: { id },
      relations: ['days', 'days.places', 'days.places.media'],
    });

    if (journey) {
      const mediaSummary =
        journey.days?.flatMap((d) => d.places || [])?.reduce(
          (acc, place) => acc + (place.media?.length || 0),
          0,
        ) || 0;

      console.log('[JOURNEY_FETCH] Loaded journey with media', {
        journeyId: id,
        dayCount: journey.days?.length || 0,
        totalMediaItems: mediaSummary,
      });
    } else {
      console.log('[JOURNEY_FETCH] Journey not found', { journeyId: id });
    }

    return journey;
  }

  async findAll(): Promise<Journey[]> {
    console.log('[JOURNEY_FETCH] findAll called');

    const journeys = await this.journeyRepo.find({
      relations: ['days', 'days.places', 'days.places.media'],
    });

    let totalMedia = 0;
    for (const j of journeys) {
      if (!j.days) continue;
      for (const d of j.days) {
        if (!d.places) continue;
        for (const place of d.places) {
          totalMedia += place.media?.length || 0;
        }
      }
    }

    console.log('[JOURNEY_FETCH] findAll result summary', {
      journeyCount: journeys.length,
      totalMediaItems: totalMedia,
    });

    return journeys;
  }

  async findByUser(userId: string): Promise<Journey[]> {
    console.log('[JOURNEY_FETCH] findByUser called', { userId });

    const journeys = await this.journeyRepo.find({
      where: { user: { id: userId } },
      relations: ['days', 'days.places', 'days.places.media', 'user'],
      order: { createdAt: 'DESC' }, // Most recent first
    });

    let totalMedia = 0;
    for (const j of journeys) {
      if (!j.days) continue;
      for (const d of j.days) {
        if (!d.places) continue;
        for (const place of d.places) {
          totalMedia += place.media?.length || 0;
        }
      }
    }

    console.log('[JOURNEY_FETCH] findByUser result summary', {
      userId,
      journeyCount: journeys.length,
      totalMediaItems: totalMedia,
    });

    return journeys;
  }

  async updateJourney(
    id: string,
    updateJourneyDto: UpdateJourneyDto,
  ): Promise<Journey> {
    console.log('[JOURNEY_UPDATE] Starting update for journey:', id);
    console.log('[JOURNEY_UPDATE] Update DTO:', JSON.stringify(updateJourneyDto));

    // Check if we have nested days to update
    const { days, ...topLevelFields } = updateJourneyDto as any;

    // Use a transaction to ensure atomicity
    return await this.dataSource.transaction(async (manager) => {
      // Step 1: Update top-level fields (title, description, coverImage)
      if (Object.keys(topLevelFields).length > 0) {
        console.log('[JOURNEY_UPDATE] Updating top-level fields:', topLevelFields);
        await manager.update('journey', id, topLevelFields);
      }

      // Step 2: If days are provided, replace existing days with new ones
      if (days && Array.isArray(days) && days.length > 0) {
        console.log('[JOURNEY_UPDATE] Processing days update, count:', days.length);

        // Delete existing media first (innermost relation)
        // Note: journey_media uses snake_case column name as defined in entity
        await manager.query(
          `DELETE FROM journey_media 
           WHERE "journey_day_place_id" IN (
             SELECT jdp.id FROM journey_day_place jdp
             INNER JOIN journey_day jd ON jdp."journeyDayId" = jd.id
             WHERE jd."journeyId" = $1
           )`,
          [id],
        );
        console.log('[JOURNEY_UPDATE] Deleted existing media');

        // Delete existing places
        await manager.query(
          `DELETE FROM journey_day_place 
           WHERE "journeyDayId" IN (
             SELECT id FROM journey_day WHERE "journeyId" = $1
           )`,
          [id],
        );
        console.log('[JOURNEY_UPDATE] Deleted existing places');

        // Delete existing days
        await manager.query(
          `DELETE FROM journey_day WHERE "journeyId" = $1`,
          [id],
        );
        console.log('[JOURNEY_UPDATE] Deleted existing days');

        // Now create new days with places and media
        for (const day of days) {
          console.log('[JOURNEY_UPDATE] Creating day:', day.dayNumber);

          // Insert the day
          const dayResult = await manager.query(
            `INSERT INTO journey_day ("dayNumber", "date", "notes", "journeyId")
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [day.dayNumber, day.date, day.notes || null, id],
          );
          const dayId = dayResult[0].id;
          console.log('[JOURNEY_UPDATE] Created day with id:', dayId);

          // Insert places for this day
          if (day.places && Array.isArray(day.places)) {
            for (const place of day.places) {
              // Handle photos/images legacy fields
              const anyPlace = place as any;
              const photos: string[] = anyPlace.photos || anyPlace.images || [];
              const explicitMedia = Array.isArray(anyPlace.media) ? anyPlace.media : [];

              // Insert the place
              const placeResult = await manager.query(
                `INSERT INTO journey_day_place 
                 ("type", "name", "description", "address", "latitude", "longitude", "startTime", "endTime", "journeyDayId")
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING id`,
                [
                  place.type,
                  place.name,
                  place.description || null,
                  place.address || null,
                  place.latitude || null,
                  place.longitude || null,
                  place.startTime || null,
                  place.endTime || null,
                  dayId,
                ],
              );
              const placeId = placeResult[0].id;
              console.log('[JOURNEY_UPDATE] Created place:', place.name, 'with id:', placeId);

              // Create media from photos (legacy support)
              const mediaFromPhotos = Array.isArray(photos)
                ? photos.map((url, index) => ({
                    type: JourneyMediaType.IMAGE,
                    url,
                    order: index,
                  }))
                : [];

              const combinedMedia = [...explicitMedia, ...mediaFromPhotos];

              // Insert media for this place
              // Note: journey_media uses snake_case column names as defined in entity
              for (const media of combinedMedia) {
                await manager.query(
                  `INSERT INTO journey_media 
                   ("type", "url", "thumbnailUrl", "duration", "order", "journey_day_place_id")
                   VALUES ($1, $2, $3, $4, $5, $6)`,
                  [
                    media.type || JourneyMediaType.IMAGE,
                    media.url,
                    media.thumbnailUrl || null,
                    media.duration || null,
                    media.order || 0,
                    placeId,
                  ],
                );
              }

              if (combinedMedia.length > 0) {
                console.log('[JOURNEY_UPDATE] Created', combinedMedia.length, 'media items for place:', place.name);
              }
            }
          }
        }

        console.log('[JOURNEY_UPDATE] Days update completed');
      }

      // Return the updated journey with all relations
      const updatedJourney = await manager.findOne(Journey, {
        where: { id },
        relations: ['days', 'days.places', 'days.places.media'],
      });

      console.log('[JOURNEY_UPDATE] Update completed successfully');
      return updatedJourney;
    });
  }

  async removeJourney(id: string): Promise<void> {
    console.log('[JourneyRepository] removeJourney called with id:', id);
    console.log('[JourneyRepository] Using transaction-based deletion');
    
    // Use a transaction to ensure all deletions succeed or fail together
    await this.dataSource.transaction(async (manager) => {
      console.log('[JourneyRepository] Starting transaction');
      
      // First, delete all journey_day_place records using a subquery
      // This handles the cascade deletion manually
      console.log('[JourneyRepository] Deleting journey_day_place records...');
      const placesResult = await manager.query(
        `DELETE FROM journey_day_place 
         WHERE "journeyDayId" IN (
           SELECT id FROM journey_day WHERE "journeyId" = $1
         )`,
        [id],
      );
      console.log('[JourneyRepository] Deleted journey_day_place records:', placesResult);

      // Then, delete all journey_day records
      console.log('[JourneyRepository] Deleting journey_day records...');
      const daysResult = await manager.query(
        `DELETE FROM journey_day WHERE "journeyId" = $1`,
        [id],
      );
      console.log('[JourneyRepository] Deleted journey_day records:', daysResult);

      // Finally, delete the journey itself
      console.log('[JourneyRepository] Deleting journey record...');
      const journeyResult = await manager.query(`DELETE FROM journey WHERE id = $1`, [id]);
      console.log('[JourneyRepository] Deleted journey record:', journeyResult);
      console.log('[JourneyRepository] Transaction completed successfully');
    });
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

    const journeys = await this.journeyRepo.find({
      where: { id: In(journeyIds) },
      relations: ['user', 'days', 'days.places', 'days.places.media'],
      order: { createdAt: 'DESC' },
    });

    let totalMedia = 0;
    for (const j of journeys) {
      if (!j.days) continue;
      for (const d of j.days) {
        if (!d.places) continue;
        for (const place of d.places) {
          totalMedia += place.media?.length || 0;
        }
      }
    }

    console.log('[JOURNEY_FETCH_NEARBY] Result summary', {
      journeyIds,
      journeyCount: journeys.length,
      totalMediaItems: totalMedia,
    });

    return journeys;
  }
}
