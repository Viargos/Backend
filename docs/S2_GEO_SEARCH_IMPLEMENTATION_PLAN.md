# Viargos S2 Geo Search Implementation Plan

Backend-first plan for adding S2 indexing to journey discovery while keeping the Discover map API-compatible.

## 1. Executive Summary

Viargos currently finds nearby journeys with a raw SQL Haversine calculation against `journey_day_place.latitude` and `journey_day_place.longitude`. This is simple and correct for small datasets, but it does not scale well because the database must calculate distance for many rows before it can filter the result set.

This plan introduces S2 as a backend geo-indexing layer for journey discovery. S2 will convert each journey place coordinate into hierarchical cell IDs. Nearby search will first select candidate places by S2 cell, then run an exact distance check before returning journeys. Users will still see the same map markers, radius buttons, and journey cards. The S2 grid should not be shown in the normal UI.

Recommended implementation style:

- Keep the existing public API shape first: `GET /journeys/nearby?latitude=&longitude=&radius=&limit=`.
- Add S2 columns to `journey_day_place`.
- Compute S2 cells on create, update, and backfill.
- Use S2 for candidate filtering.
- Keep exact Haversine filtering as the final correctness step.
- Sort by distance first, then recency.
- Use nearby radius options of `50km`, `100km`, `250km`, `500km`, and `1000km`.
- Add optional debug metadata only for internal verification.

## 2. Current State

### Current API Flow

Frontend:

- `viargos-fe/src/modules/discover/hooks/use-discover.ts`
- `viargos-fe/src/modules/discover/services/discover.service.ts`
- `viargos-fe/src/app/api/journeys/nearby/route.ts`

Backend:

- `viargos-be/src/modules/journey/journey.controller.ts`
- `viargos-be/src/modules/journey/journey.service.ts`
- `viargos-be/src/modules/journey/journey.repository.ts`
- `viargos-be/src/modules/journey/dto/nearby-journeys.dto.ts`
- `viargos-be/src/modules/journey/entities/journey-day-place.entity.ts`

Current request:

```txt
Discover page
  -> discoverService.getNearbyJourneys()
  -> /api/journeys/nearby
  -> backend /journeys/nearby
  -> JourneyController.findNearbyJourneys()
  -> JourneyService.findNearby()
  -> JourneyRepository.findNearbyJourneys()
```

### Current Search Algorithm

`JourneyRepository.findNearbyJourneys()` runs a SQL Haversine formula:

```txt
latitude + longitude + radiusKm
  -> scan places with non-null coordinates
  -> compute distance using Haversine
  -> filter distance <= radiusKm
  -> return distinct journeys
```

Issues:

- The query is CPU-heavy as data grows.
- There is no spatial prefilter.
- There is no S2, geohash, quadtree, or PostGIS index.
- Results are currently ordered by `journey.createdAt DESC`, not nearest distance.
- Existing update code inserts places through raw SQL, so any new derived geo fields must be handled manually there.

## 3. Goals

### Product Goals

- Nearby journey discovery should stay fast as journey/place data grows.
- Map markers and right-side journey cards should load quickly after location/radius changes.
- Results should feel location-relevant by prioritizing closer journeys.
- The implementation should not expose technical S2 concepts to normal users.

### Engineering Goals

- Make geo search indexable.
- Keep API compatibility with the frontend during the first rollout.
- Store enough S2 precision levels to support small, medium, and large radius searches.
- Keep exact distance filtering so S2 cell boundaries do not create incorrect results.
- Make create, update, and migration/backfill paths consistent.
- Add tests around S2 cell generation, query construction, and API behavior.

## 4. Non-Goals

- Do not render S2 grid cells in the production map UI.
- Do not replace Google Maps rendering.
- Do not redesign the Discover UI as part of the S2 work.
- Do not build distributed geo search in the first implementation.
- Do not remove latitude/longitude columns.
- Do not remove exact distance filtering.
- Do not add PostGIS in this S2 implementation unless we separately decide to combine both.

## 5. Functional Requirements

### FR-1: Store S2 Cell IDs For Journey Places

For every `journey_day_place` row with valid latitude and longitude, store S2 cell IDs.

Minimum fields:

```txt
s2CellIdLevel10
s2CellIdLevel12
s2CellIdLevel14
```

Recommended use:

- Level 10: large-radius search.
- Level 12: medium-radius search.
- Level 14: city/local-radius search.

Exact levels should be validated during implementation with real query sizes and selected S2 library behavior.

### FR-2: Compute S2 Cells On Journey Create

When creating a journey with places:

- If a place has both latitude and longitude, compute all configured S2 cell IDs.
- If either coordinate is missing, leave S2 fields `NULL`.
- Invalid coordinates should be rejected by DTO validation before persistence.

### FR-3: Compute S2 Cells On Journey Update

When updating a journey:

- Existing update logic deletes old places and inserts new places through raw SQL.
- The insert statement must include the new S2 columns.
- S2 values must be recomputed from the submitted latitude/longitude.

### FR-4: Backfill Existing Data

Existing journey places with coordinates must receive S2 cell IDs through a migration or one-time script.

Rules:

- Only backfill rows where latitude and longitude are not null.
- Leave S2 fields null for rows without complete coordinates.
- Backfill must be idempotent.

### FR-5: Search Nearby Journeys Using S2 Candidate Cells

Nearby search should:

1. Accept latitude, longitude, radius, and limit.
2. Select an S2 level based on radius.
3. Compute covering cells for the search circle.
4. Query places where the selected S2 column is in the covering cell list.
5. Compute exact distance for candidates.
6. Keep only candidates inside the requested radius.
7. Group/dedupe by journey.
8. Return journeys sorted by nearest matching place distance, then created date.

### FR-6: Preserve Existing API Contract

The first rollout should keep this endpoint:

```http
GET /journeys/nearby?latitude=23.0225&longitude=72.5714&radius=500&limit=20
```

Existing frontend code should keep working without a required change.

### FR-7: Optional Distance Metadata

Optional future response metadata:

```json
{
  "distanceKm": 12.4,
  "nearestPlaceId": "place-id",
  "nearestPlaceName": "Some Place"
}
```

This is useful for showing "12 km away" in the UI, but should not be required for the first S2 backend rollout.

### FR-8: Observability

Nearby search logs should include:

- Request latitude/longitude rounded for privacy.
- Radius.
- Chosen S2 level.
- Covering cell count.
- Candidate place count.
- Journey result count.
- Query duration.

Do not log full precision user coordinates unless needed for local debugging.

### FR-9: Nearby Radius Policy

Nearby discovery should use a bounded radius set:

```txt
50km
100km
250km
500km
1000km
```

The Discover UI should not offer `5000km` or `10000km` as nearby search options. Those ranges are continent/global discovery and should be handled by a separate future surface such as "Explore Worldwide", "Trending Journeys", or "Popular Journeys".

## 6. Non-Functional Requirements

### Performance

- Nearby search should avoid full-table distance scans for normal radii.
- P95 API latency target for nearby search: under 300 ms for moderate data volume.
- S2 candidate query should use database indexes.
- Limit max cell covering size to avoid oversized `IN (...)` queries.

### Correctness

- Results must not include journeys outside the requested radius after final exact filtering.
- Cell boundary edge cases must be covered by tests.
- International Date Line and high-latitude coordinates must be tested.
- Missing coordinates must not crash indexing or search.

### Reliability

- Migration/backfill must be rerunnable safely.
- Create/update paths must not save stale S2 values when coordinates change.
- Search must fall back gracefully if no covering cells are produced.

### Security and Privacy

- The endpoint remains authenticated through existing `JwtAuthGuard`.
- Logs should avoid storing exact user locations unnecessarily.
- Debug S2 metadata should be gated behind environment/config or omitted from public responses.

### Maintainability

- S2 logic should live in a dedicated service/helper, not inside the repository SQL method.
- The radius-to-level decision should be centralized and tested.
- Query behavior should be documented in code comments only where needed.

## 7. High-Level Design

### HLD Diagram

```txt
User location/radius
        |
        v
Discover frontend
        |
        v
Next API proxy: /api/journeys/nearby
        |
        v
Backend controller: /journeys/nearby
        |
        v
JourneyService.findNearby()
        |
        v
GeoIndexService
  - choose S2 level
  - compute covering cells
        |
        v
JourneyRepository.findNearbyJourneysByS2()
  - S2 indexed candidate query
  - exact distance filter
  - nearest place per journey
        |
        v
Journey entities with days/places/media
        |
        v
Frontend map markers + journey cards
```

### Data Flow On Write

```txt
Create/Edit journey payload
        |
        v
Place latitude/longitude
        |
        v
GeoIndexService.buildPlaceS2Index()
        |
        v
journey_day_place row
  - latitude
  - longitude
  - s2CellIdLevel10
  - s2CellIdLevel12
  - s2CellIdLevel14
```

### Data Flow On Search

```txt
Search center + radius
        |
        v
GeoIndexService.getCoveringCells()
        |
        v
SQL candidate query by selected S2 column
        |
        v
Exact Haversine distance filter
        |
        v
Dedup journeys by nearest place
        |
        v
Return journeys
```

## 8. Low-Level Design

### 8.1 S2 Data Model

Update entity:

```txt
viargos-be/src/modules/journey/entities/journey-day-place.entity.ts
```

Add nullable string columns:

```ts
@Column({ nullable: true })
s2CellIdLevel10?: string;

@Column({ nullable: true })
s2CellIdLevel12?: string;

@Column({ nullable: true })
s2CellIdLevel14?: string;
```

Column naming in database should be confirmed by TypeORM naming behavior. Existing code currently uses quoted camelCase columns like `"journeyDayId"` and `"createdAt"`, so raw SQL must use the actual generated names.

Recommended DB column names if keeping TypeORM default:

```txt
s2CellIdLevel10
s2CellIdLevel12
s2CellIdLevel14
```

Alternative snake-case names are also fine, but then entity column names should explicitly set `name`.

### 8.2 Migration

Add migration:

```txt
viargos-be/src/migrations/<timestamp>-AddS2CellsToJourneyDayPlace.ts
```

Migration responsibilities:

- Add nullable columns.
- Add indexes.
- Optionally backfill existing rows if S2 computation can run safely inside migration.

Recommended indexes:

```sql
CREATE INDEX "IDX_journey_day_place_s2_l10"
ON "journey_day_place" ("s2CellIdLevel10")
WHERE "s2CellIdLevel10" IS NOT NULL;

CREATE INDEX "IDX_journey_day_place_s2_l12"
ON "journey_day_place" ("s2CellIdLevel12")
WHERE "s2CellIdLevel12" IS NOT NULL;

CREATE INDEX "IDX_journey_day_place_s2_l14"
ON "journey_day_place" ("s2CellIdLevel14")
WHERE "s2CellIdLevel14" IS NOT NULL;
```

If TypeORM migration helpers are used, create `TableColumn` and `TableIndex` objects.

### 8.3 Geo Index Service

Add:

```txt
viargos-be/src/modules/journey/geo/geo-index.service.ts
viargos-be/src/modules/journey/geo/geo-index.types.ts
viargos-be/src/modules/journey/geo/haversine.util.ts
```

Responsibilities:

- Validate coordinate completeness.
- Convert lat/lng to S2 cell IDs for configured levels.
- Select S2 search level by radius.
- Build covering cell IDs for a center/radius.
- Provide exact Haversine distance as a pure utility.

Suggested interface:

```ts
export type S2PlaceIndex = {
  s2CellIdLevel10: string | null;
  s2CellIdLevel12: string | null;
  s2CellIdLevel14: string | null;
};

export type S2SearchCovering = {
  cellIds: string[];
  level: 10 | 12 | 14;
  columnName: 's2CellIdLevel10' | 's2CellIdLevel12' | 's2CellIdLevel14';
};

export class GeoIndexService {
  buildPlaceIndex(latitude?: number | null, longitude?: number | null): S2PlaceIndex;

  buildSearchCovering(input: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  }): S2SearchCovering;

  distanceKm(from: Coordinates, to: Coordinates): number;
}
```

Radius-to-level rule, initial proposal:

```txt
50km - 100km      -> level 14
250km - 500km     -> level 12
1000km            -> level 10
```

This should be tuned after measuring candidate counts with realistic journey data.

### 8.4 S2 Library Dependency

Add an S2 library to:

```txt
viargos-be/package.json
viargos-be/package-lock.json
```

Library selection requirements:

- Works in Node.js.
- Supports TypeScript or has reliable typings.
- Can create a cell ID from latitude/longitude at a fixed level.
- Can generate a covering set for a radius/cap/loop around a point.
- Uses stable string or numeric IDs suitable for database storage.

Implementation issue should include a short spike to select the exact package. Do not hand-roll S2 math.

### 8.5 Journey Create Path

File:

```txt
viargos-be/src/modules/journey/journey.repository.ts
```

Current create path transforms nested DTOs and uses TypeORM cascade save.

Required change:

- Inject or otherwise access `GeoIndexService`.
- During `createJourney()` transformation, compute S2 fields for every place.

Pseudo-logic:

```ts
const s2Index = this.geoIndexService.buildPlaceIndex(
  place.latitude,
  place.longitude,
);

return {
  ...rest,
  ...s2Index,
  endTime: normalizeOptionalTime(anyPlace.endTime),
  media: combinedMedia.length > 0 ? combinedMedia : undefined,
  startTime: normalizeOptionalTime(anyPlace.startTime),
};
```

### 8.6 Journey Update Path

File:

```txt
viargos-be/src/modules/journey/journey.repository.ts
```

Current update path deletes old days/places and inserts new `journey_day_place` rows using raw SQL.

Required change:

- Compute S2 index before each place insert.
- Add S2 columns to the insert column list.
- Add S2 values to the `VALUES` list.

Pseudo-SQL:

```sql
INSERT INTO journey_day_place
  (
    "type",
    "name",
    "description",
    "address",
    "latitude",
    "longitude",
    "s2CellIdLevel10",
    "s2CellIdLevel12",
    "s2CellIdLevel14",
    ...
  )
VALUES
  ($1, $2, $3, $4, $5, $6, $7, $8, $9, ...)
```

This is a high-risk area because missing this step would make edited journeys disappear from S2 search.

### 8.7 Repository Search Method

File:

```txt
viargos-be/src/modules/journey/journey.repository.ts
```

Current method:

```ts
findNearbyJourneys(latitude, longitude, radiusKm, limit): Promise<Journey[]>
```

Recommended change:

```ts
findNearbyJourneysByS2(input: {
  latitude: number;
  longitude: number;
  radiusKm: number;
  limit: number;
  covering: S2SearchCovering;
}): Promise<Journey[]>
```

Optionally keep the old method name and change internals to reduce service changes.

Query shape:

```sql
WITH candidate_places AS (
  SELECT
    j.id AS "journeyId",
    jdp.id AS "placeId",
    (
      6371 * acos(
        LEAST(
          1,
          GREATEST(
            -1,
            cos(radians($1)) * cos(radians(jdp.latitude)) *
            cos(radians(jdp.longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(jdp.latitude))
          )
        )
      )
    ) AS "distanceKm"
  FROM journey j
  INNER JOIN journey_day jd ON jd."journeyId" = j.id
  INNER JOIN journey_day_place jdp ON jdp."journeyDayId" = jd.id
  WHERE jdp.latitude IS NOT NULL
    AND jdp.longitude IS NOT NULL
    AND jdp."<selectedS2Column>" = ANY($3)
),
nearest_journey AS (
  SELECT
    "journeyId",
    MIN("distanceKm") AS "nearestDistanceKm"
  FROM candidate_places
  WHERE "distanceKm" <= $4
  GROUP BY "journeyId"
)
SELECT j.id
FROM nearest_journey nj
INNER JOIN journey j ON j.id = nj."journeyId"
ORDER BY nj."nearestDistanceKm" ASC, j."createdAt" DESC
LIMIT $5
```

Important details:

- Do not interpolate user input.
- Only allow selected S2 column from a fixed allowlist.
- Clamp `acos` input with `LEAST/GREATEST` to avoid floating point domain errors.
- Fetch full journey entities by IDs after selecting ordered IDs.
- Preserve result order when loading full entities. TypeORM `find({ where: { id: In(ids) } })` may not preserve order, so reorder in memory using the selected ID list.

### 8.8 Service Layer

File:

```txt
viargos-be/src/modules/journey/journey.service.ts
```

Required change:

- Inject `GeoIndexService`.
- Build search covering in `findNearby`.
- Pass covering to repository.
- Consider fallback behavior if covering cell count is zero.

Pseudo-logic:

```ts
async findNearby(nearbyDto: NearbyJourneysDto): Promise<Journey[]> {
  const radiusKm = nearbyDto.radius || 10;
  const limit = nearbyDto.limit || 20;
  const covering = this.geoIndexService.buildSearchCovering({
    latitude: nearbyDto.latitude,
    longitude: nearbyDto.longitude,
    radiusKm,
  });

  return this.journeyRepository.findNearbyJourneysByS2({
    latitude: nearbyDto.latitude,
    longitude: nearbyDto.longitude,
    radiusKm,
    limit,
    covering,
  });
}
```

### 8.9 Module Wiring

File:

```txt
viargos-be/src/modules/journey/journey.module.ts
```

Required change:

- Add `GeoIndexService` to providers.
- Export only if needed by other modules later.

### 8.10 DTO Validation

Files:

```txt
viargos-be/src/modules/journey/dto/create-journey-day-place.dto.ts
viargos-be/src/modules/journey/dto/update-journey-day-place.dto.ts
viargos-be/src/modules/journey/dto/nearby-journeys.dto.ts
```

Recommended changes:

- Add `@Min(-90)`, `@Max(90)` to place latitude.
- Add `@Min(-180)`, `@Max(180)` to place longitude.
- Ensure create/update rejects one-sided coordinates if product requires searchable places to have complete coordinates.
- Keep nearby DTO as is, but consider changing service default radius from `10` to DTO default `500` for consistency.

### 8.11 Frontend Changes

Required frontend changes for first rollout:

- None required if API response remains unchanged.

Recommended optional frontend changes:

```txt
viargos-fe/src/modules/discover/dto/discover.dto.ts
viargos-fe/src/modules/discover/types/discover.types.ts
viargos-fe/src/modules/discover/mappers/discover.mapper.ts
viargos-fe/src/modules/discover/components/DiscoveryCard.tsx
viargos-fe/src/modules/discover/components/FloatingPreview.tsx
```

Optional additions:

- Add `distanceKm?: number` to DTO/types if backend returns distance.
- Show "12 km away" on cards/previews.
- Add debug-only S2 metadata display behind a developer flag.

Do not show S2 grid cells to regular users.

## 9. API Design

### Existing Endpoint, Kept Stable

```http
GET /journeys/nearby?latitude={number}&longitude={number}&radius={number}&limit={number}
Authorization: Bearer <token>
```

Example:

```http
GET /journeys/nearby?latitude=23.0225&longitude=72.5714&radius=500&limit=20
```

Response, current-compatible:

```json
{
  "statusCode": 200,
  "message": "Nearby journeys retrieved successfully",
  "data": [
    {
      "id": "journey-id",
      "title": "kashmir",
      "description": "Trip description",
      "coverImage": "https://...",
      "createdAt": "2026-02-22T00:00:00.000Z",
      "user": {
        "id": "user-id",
        "username": "traveler",
        "profileImage": "https://..."
      },
      "days": [
        {
          "id": "day-id",
          "dayNumber": 1,
          "places": [
            {
              "id": "place-id",
              "name": "Dal Lake",
              "latitude": "34.0837",
              "longitude": "74.7973"
            }
          ]
        }
      ]
    }
  ]
}
```

### Optional Future API Response

If distance display becomes a product requirement:

```json
{
  "id": "journey-id",
  "title": "kashmir",
  "distanceKm": 12.4,
  "nearestPlaceId": "place-id",
  "nearestPlaceName": "Dal Lake"
}
```

This can be added in a backward-compatible way because frontend mappers ignore unknown fields today.

### Optional Debug API

Only for local/admin debugging:

```http
GET /journeys/nearby/debug?latitude=&longitude=&radius=
```

Potential response:

```json
{
  "level": 12,
  "cellCount": 38,
  "candidatePlaceCount": 184,
  "resultJourneyCount": 20
}
```

Do not expose this publicly without admin authorization.

## 10. File-by-File Change List

### Backend Dependency

```txt
viargos-be/package.json
viargos-be/package-lock.json
```

Changes:

- Add selected S2 npm package.
- Confirm package supports Node runtime and TypeScript.

### Backend Entity

```txt
viargos-be/src/modules/journey/entities/journey-day-place.entity.ts
```

Changes:

- Add S2 columns.
- Keep columns nullable.
- Do not remove `latitude` or `longitude`.

### Backend Migration

```txt
viargos-be/src/migrations/<timestamp>-AddS2CellsToJourneyDayPlace.ts
```

Changes:

- Add S2 columns.
- Add partial indexes.
- Implement down migration.

### Backend Geo Service

```txt
viargos-be/src/modules/journey/geo/geo-index.service.ts
viargos-be/src/modules/journey/geo/geo-index.types.ts
viargos-be/src/modules/journey/geo/haversine.util.ts
```

Changes:

- New code for S2 cell generation and covering.
- New pure Haversine utility.
- Unit tests for edge cases.

### Backend Module

```txt
viargos-be/src/modules/journey/journey.module.ts
```

Changes:

- Register `GeoIndexService`.

### Backend Repository

```txt
viargos-be/src/modules/journey/journey.repository.ts
```

Changes:

- Inject `GeoIndexService`.
- Compute S2 values during `createJourney()`.
- Compute S2 values during raw SQL update inserts.
- Replace or extend nearby search with S2 candidate query.
- Preserve selected journey ordering after loading full entities.

### Backend Service

```txt
viargos-be/src/modules/journey/journey.service.ts
```

Changes:

- Build S2 search covering.
- Pass covering to repository.
- Normalize radius/limit defaults consistently.

### Backend Controller

```txt
viargos-be/src/modules/journey/journey.controller.ts
```

Changes:

- Keep route unchanged.
- Add search metadata to logs if service exposes it.
- Update Swagger description to mention indexed nearby search, not S2 internals.

### Backend DTOs

```txt
viargos-be/src/modules/journey/dto/create-journey-day-place.dto.ts
viargos-be/src/modules/journey/dto/update-journey-day-place.dto.ts
viargos-be/src/modules/journey/dto/nearby-journeys.dto.ts
```

Changes:

- Add coordinate min/max validation to create/update place DTOs.
- Review default radius consistency.

### Backend Tests

```txt
viargos-be/src/modules/journey/spec/geo-index.service.spec.ts
viargos-be/src/modules/journey/spec/journey.repository.s2.spec.ts
viargos-be/src/modules/journey/spec/journey.service.spec.ts
viargos-be/test/journey-nearby.e2e-spec.ts
```

Changes:

- New specs for S2 indexing and nearby behavior.

### Frontend Service/API

```txt
viargos-fe/src/app/api/journeys/nearby/route.ts
viargos-fe/src/modules/discover/services/discover.service.ts
viargos-fe/src/modules/discover/hooks/use-discover.ts
```

Changes:

- No required changes in first rollout.
- Optional: pass a debug flag only in local development.
- Optional: consume distance metadata.

### Frontend DTO/Types/Mapper

```txt
viargos-fe/src/modules/discover/dto/discover.dto.ts
viargos-fe/src/modules/discover/types/discover.types.ts
viargos-fe/src/modules/discover/mappers/discover.mapper.ts
```

Changes:

- Optional `distanceKm` support.

### Frontend UI

```txt
viargos-fe/src/modules/discover/components/DiscoveryCard.tsx
viargos-fe/src/modules/discover/components/FloatingPreview.tsx
viargos-fe/src/modules/discover/components/DiscoverSidebar.tsx
viargos-fe/src/modules/discover/components/MapPanel.tsx
```

Changes:

- No required S2 UI.
- Optional: show distance label.
- Optional: show radius/search circle if product wants a visual cue.

## 11. Issue-by-Issue Implementation Plan

### Issue 1: Select S2 Library

Scope:

- Evaluate Node-compatible S2 packages.
- Confirm TypeScript support.
- Confirm fixed-level cell ID generation.
- Confirm covering/cap support.
- Decide database storage format.

Acceptance criteria:

- A package is selected.
- A minimal proof of concept converts lat/lng to level 10/12/14 cell IDs.
- A minimal proof of concept produces covering cells for a radius.
- Decision is documented in code comments or this doc.

Estimate:

- 0.5 day.

### Issue 2: Add S2 Schema Columns And Indexes

Scope:

- Add entity fields.
- Create migration.
- Add partial indexes.
- Run migration locally.

Acceptance criteria:

- `journey_day_place` has nullable S2 columns.
- Indexes exist for each S2 level.
- Migration up/down works.

Estimate:

- 0.5 day.

### Issue 3: Add GeoIndexService

Scope:

- Add service/types/util files.
- Implement place index generation.
- Implement radius-to-level selection.
- Implement search covering generation.
- Implement exact distance utility.

Acceptance criteria:

- Valid coordinates produce all configured S2 cell IDs.
- Missing coordinates return null S2 fields.
- Radius selects expected level.
- Covering cell generation returns a bounded, non-empty list for common radii.
- Unit tests pass.

Estimate:

- 1 day.

### Issue 4: Write S2 Values On Journey Create

Scope:

- Update `JourneyRepository.createJourney()`.
- Add S2 fields during place transformation.
- Add tests/mocks around transformation behavior.

Acceptance criteria:

- New journey places with coordinates save S2 fields.
- Places without coordinates save null S2 fields.
- Existing media/photo behavior still works.

Estimate:

- 0.5 day.

### Issue 5: Write S2 Values On Journey Update

Scope:

- Update raw SQL place insert in `JourneyRepository.updateJourney()`.
- Include S2 columns and parameter values.
- Add tests around generated SQL call values if practical.

Acceptance criteria:

- Edited journey places save fresh S2 fields.
- Changed coordinates change S2 fields.
- Removed coordinates clear S2 fields.
- Existing media insertion still works.

Estimate:

- 0.5-1 day.

### Issue 6: Backfill Existing Places

Scope:

- Implement one-time backfill migration or script.
- Process existing rows with non-null coordinates.
- Skip invalid/missing coordinates.

Acceptance criteria:

- Existing places become searchable by S2.
- Backfill is idempotent.
- Backfill can be safely rerun.
- Backfill progress/errors are logged.

Estimate:

- 0.5-1 day.

### Issue 7: Replace Nearby Search With S2 Candidate Query

Scope:

- Build covering in service.
- Add S2 candidate query in repository.
- Run exact distance filtering.
- Deduplicate by journey.
- Sort nearest first, then newest.
- Preserve order after entity hydration.

Acceptance criteria:

- Endpoint returns only journeys within radius.
- Endpoint returns nearest journeys first.
- Query uses selected S2 index.
- Existing frontend receives same shape as before.
- Tests cover normal radius, tiny radius, large radius, and no results.

Estimate:

- 1-1.5 days.

### Issue 8: Observability And Logging

Scope:

- Add structured logs for level/cell/candidate/result counts.
- Round request coordinates in logs.
- Add timing measurement around repository query.

Acceptance criteria:

- Logs show enough data to debug search performance.
- Logs do not expose unnecessary precise location.

Estimate:

- 0.5 day.

### Issue 9: Optional Distance Metadata

Scope:

- Add `distanceKm` and nearest place metadata to backend response.
- Add frontend DTO/type/mapper support.
- Show distance in journey cards if product wants it.

Acceptance criteria:

- UI gracefully handles absence of distance.
- Existing endpoint remains backward-compatible.

Estimate:

- 0.5-1 day.

### Issue 10: End-to-End QA

Scope:

- Seed known journeys around test coordinates.
- Verify Discover page shows correct markers/cards.
- Verify radius filters change results.
- Verify no UI regression.

Acceptance criteria:

- Frontend e2e test passes.
- Backend e2e test passes.
- Manual map smoke test passes.

Estimate:

- 0.5-1 day.

## 12. Testing Strategy

### Unit Tests

Add:

```txt
viargos-be/src/modules/journey/spec/geo-index.service.spec.ts
```

Cases:

- Builds S2 cell IDs for valid coordinates.
- Returns null fields when latitude is missing.
- Returns null fields when longitude is missing.
- Selects level 14 for small radius.
- Selects level 12 for medium radius.
- Selects level 10 for large radius.
- Produces covering cells for normal search.
- Handles International Date Line coordinates.
- Handles near-pole coordinates.
- Haversine returns near-zero for identical points.
- Haversine returns expected approximate distance for known city pair.

### Repository Tests

Add:

```txt
viargos-be/src/modules/journey/spec/journey.repository.s2.spec.ts
```

Cases:

- Create path saves S2 columns.
- Update path raw SQL includes S2 columns.
- Search query uses only allowlisted S2 column names.
- Search query passes covering cells as parameters.
- Hydrated journeys are reordered according to selected ID order.

### Service Tests

Add:

```txt
viargos-be/src/modules/journey/spec/journey.service.spec.ts
```

Cases:

- `findNearby()` builds S2 covering from DTO.
- Defaults radius/limit consistently.
- Empty covering returns empty result or configured fallback.
- Repository is called with expected radius, limit, level, and cell IDs.

### Backend E2E Tests

Add:

```txt
viargos-be/test/journey-nearby.e2e-spec.ts
```

Cases:

- Authenticated request returns nearby journey.
- Journey outside radius is excluded.
- Larger radius includes more journeys.
- Edited journey with changed coordinates appears in new area.
- Missing coordinate place is ignored.

### Frontend Tests

Existing:

```txt
viargos-fe/tests/e2e/Smoke.e2e.ts
```

Add/extend cases:

- Mock `/api/journeys/nearby` and verify cards render.
- Verify radius button triggers nearby refetch.
- If distance metadata is added, verify distance label renders without layout break.

### Manual QA

Use known coordinate sets:

- Same city: small radius should return local journeys.
- Nearby city: medium radius should return nearby city journeys.
- Max nearby radius: `1000km` should return regional results without becoming a worldwide feed.
- Date Line: coordinates around `179.9` and `-179.9` longitude.
- Empty area: should show empty state.

## 13. Rollout Plan

### Phase 1: Internal S2 Write Path

- Add S2 columns.
- Write S2 values on create/update.
- Keep nearby query unchanged.
- Backfill existing data.

Reason:

- Low-risk deployment.
- Allows verifying S2 data quality before changing search behavior.

### Phase 2: S2 Read Path Behind Feature Flag

- Add S2 nearby query.
- Keep Haversine query available as fallback.
- Add config flag:

```txt
GEO_SEARCH_ENGINE=s2
```

Possible values:

```txt
haversine
s2
```

Reason:

- Enables quick rollback without schema rollback.

### Phase 3: Default To S2

- Make S2 the default search engine after QA.
- Monitor latency, result count, and error logs.
- Keep Haversine fallback for one release cycle.

### Phase 4: Optional UI Distance

- Add distance metadata and display if product wants it.
- Avoid showing S2-specific implementation details.

## 14. Risks And Mitigations

### Risk: Cell Covering Misses Nearby Places

Mitigation:

- Use a tested S2 library.
- Use covering cells that fully cover the search circle.
- Keep exact distance filter after candidate lookup.
- Add boundary tests.

### Risk: Too Many Candidate Cells For Large Radius

Mitigation:

- Select lower precision level for large radii.
- Cap maximum covering cells.
- Keep nearby search capped at `1000km`; use a separate product surface for worldwide discovery.

### Risk: Edited Journeys Lose Searchability

Mitigation:

- Update raw SQL insert path.
- Add tests specifically for update path.

### Risk: Query Result Order Is Lost During Hydration

Mitigation:

- Reorder loaded journeys in memory according to selected ID order.

### Risk: S2 Library Stores IDs In Unsafe Numeric Range

Mitigation:

- Store cell IDs as strings.
- Avoid JavaScript unsafe integer conversion.

### Risk: Backfill Is Slow

Mitigation:

- Batch backfill.
- Use progress logging.
- Run during low traffic.
- Keep columns nullable during rollout.

## 15. Open Decisions

1. Exact S2 library/package.
2. Exact S2 levels after testing candidate counts.
3. Whether to add distance metadata in first release or second release.
4. Whether to add `GEO_SEARCH_ENGINE` feature flag immediately.
5. Whether backfill should live in a migration or a separate operational script.

Recommended decisions:

- Use feature flag from the start.
- Store S2 IDs as strings.
- Keep S2 levels 10/12/14 for first implementation.
- Add distance metadata later, after backend behavior is stable.
- Prefer separate backfill script if production data volume is large.

## 16. Estimated Timeline

### MVP Backend S2 Search

```txt
Library spike:              0.5 day
Schema + indexes:           0.5 day
GeoIndexService:            1 day
Create/update write path:   1-1.5 days
Backfill:                   0.5-1 day
S2 search query:            1-1.5 days
Tests + QA:                 1-1.5 days
```

Total:

```txt
5-7 engineering days
```

### With Distance UI And Debug Tooling

Additional:

```txt
Frontend distance metadata: 0.5-1 day
Debug endpoint/tooling:     0.5 day
Extra QA:                   0.5 day
```

Total:

```txt
6-9 engineering days
```

## 17. Recommended Final Architecture

For this app, S2 should be treated as an indexed prefilter, not the final source of truth.

Final query model:

```txt
S2 covering cells
  -> indexed candidate places
  -> exact Haversine distance
  -> nearest place per journey
  -> sorted journey result
```

Final user experience:

```txt
User changes location/radius
  -> map refreshes nearby markers/cards
  -> optional "x km away" appears later
  -> no S2 grid is visible
```

This keeps the product clean while making search performance much more scalable than the current full Haversine scan.
