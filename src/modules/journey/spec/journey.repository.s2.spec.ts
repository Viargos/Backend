import { JourneyRepository } from '../journey.repository';
import { PlaceType } from '../entities/journey-day-place.entity';
import { GeoIndexService } from '../geo/geo-index.service';

describe('JourneyRepository S2 write paths', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    jest.restoreAllMocks();
  });

  function createRepository(journeyRepo: Record<string, jest.Mock>, dataSource: Record<string, jest.Mock>) {
    return new JourneyRepository(
      journeyRepo as any,
      dataSource as any,
      new GeoIndexService(),
    );
  }

  it('adds computed S2 tokens to nested places during journey creation', async () => {
    const journeyRepo = {
      create: jest.fn(input => input),
      save: jest.fn(async input => ({ ...input, id: 'journey-1' })),
    };
    const repository = createRepository(journeyRepo, {});

    await repository.createJourney({
      days: [
        {
          date: new Date('2026-02-22T00:00:00.000Z'),
          dayNumber: 1,
          places: [
            {
              address: 'Ahmedabad',
              latitude: 23.0225,
              longitude: 72.5714,
              name: 'Sabarmati Riverfront',
              s2CellIdLevel10: 'client-supplied-value',
              type: PlaceType.ACTIVITY,
            } as any,
          ],
        },
      ],
      title: 'Ahmedabad',
      user: { id: 'user-1' } as any,
    });

    const createdPayload = journeyRepo.create.mock.calls[0][0];
    const place = createdPayload.days[0].places[0];

    expect(place).toMatchObject({
      s2CellIdLevel10: '395e85',
      s2CellIdLevel12: '395e845',
      s2CellIdLevel14: '395e8457',
    });
  });

  it('adds computed S2 tokens to raw SQL place inserts during journey updates', async () => {
    const manager = {
      findOne: jest.fn(async () => ({ id: 'journey-1' })),
      query: jest.fn(async (sql: string, _params?: unknown[]) => {
        if (sql.includes('INSERT INTO journey_day ')) {
          return [{ id: 'day-1' }];
        }

        if (sql.includes('INSERT INTO journey_day_place')) {
          return [{ id: 'place-1' }];
        }

        return [];
      }),
      update: jest.fn(),
    };
    const dataSource = {
      transaction: jest.fn(async callback => callback(manager)),
    };
    const repository = createRepository({} as any, dataSource);

    await repository.updateJourney('journey-1', {
      days: [
        {
          date: '2026-02-22',
          dayNumber: 1,
          places: [
            {
              latitude: 0,
              longitude: 0,
              name: 'Equator Center',
              type: PlaceType.ACTIVITY,
            },
          ],
        },
      ],
    });

    const queryCalls = manager.query.mock.calls as Array<[string, unknown[]?]>;
    const placeInsertCall = queryCalls.find(([sql]) =>
      String(sql).includes('INSERT INTO journey_day_place'),
    );

    expect(placeInsertCall).toBeDefined();
    expect(placeInsertCall[0]).toContain('"s2CellIdLevel10"');
    expect(placeInsertCall[0]).toContain('"s2CellIdLevel12"');
    expect(placeInsertCall[0]).toContain('"s2CellIdLevel14"');
    const placeInsertParams = placeInsertCall[1];

    expect(placeInsertParams).toHaveLength(16);
    expect(placeInsertParams[4]).toBe(0);
    expect(placeInsertParams[5]).toBe(0);
    expect(placeInsertParams[6]).toEqual(expect.any(String));
    expect(placeInsertParams[7]).toEqual(expect.any(String));
    expect(placeInsertParams[8]).toEqual(expect.any(String));
  });
});
