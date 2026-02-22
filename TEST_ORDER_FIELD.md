# Order Field Implementation - Testing Guide

## ✅ Implementation Complete

All backend changes have been implemented:

### Files Modified:
1. ✅ **Migration**: `/src/migrations/1708800000000-AddOrderToJourneyDayPlace.ts`
2. ✅ **Entity**: `/src/modules/journey/entities/journey-day-place.entity.ts`
3. ✅ **DTO**: `/src/modules/journey/dto/create-journey-day-place.dto.ts`
4. ✅ **Repository**: `/src/modules/journey/journey.repository.ts`

---

## Testing Steps

### Step 1: Run Migration

```bash
cd /Users/sarangtandel/Documents/Code/Vraj/Viargos/viargos-be

# Run the migration
npm run typeorm migration:run

# Expected output:
# Migration AddOrderToJourneyDayPlace1708800000000 has been executed successfully.
# ✅ Added "order" column to journey_day_place table
# ✅ Backfilled order for X existing places
```

### Step 2: Verify Database Column

```bash
# Connect to your database and run:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'journey_day_place' AND column_name = 'order';

# Expected output:
# column_name | data_type | is_nullable
# ------------|-----------|------------
# order       | integer   | YES
```

### Step 3: Start Backend

```bash
npm run start:dev

# Backend should start without errors
# If you see TypeORM errors, make sure migration ran successfully
```

### Step 4: Test Journey Creation

```bash
# Create a test journey with order field
curl -X POST http://localhost:3000/api/journeys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "Order Test Journey",
    "description": "Testing order field implementation",
    "days": [{
      "dayNumber": 0,
      "date": "2026-02-22T00:00:00.000Z",
      "notes": "Day 1",
      "places": [
        {
          "type": "FOOD",
          "name": "Restaurant ABC",
          "order": 0,
          "startTime": "09:00",
          "endTime": "10:00",
          "address": "123 Main St"
        },
        {
          "type": "ACTIVITY",
          "name": "Museum XYZ",
          "order": 1,
          "startTime": "10:00",
          "endTime": "12:00",
          "address": "456 Park Ave"
        },
        {
          "type": "STAY",
          "name": "Hotel Downtown",
          "order": 2,
          "startTime": "12:00",
          "endTime": "13:00",
          "address": "789 Hotel Blvd"
        }
      ]
    }]
  }'

# Expected response:
# {
#   "id": "journey-uuid",
#   "title": "Order Test Journey",
#   "days": [{
#     "places": [
#       {"type": "FOOD", "name": "Restaurant ABC", "order": 0},
#       {"type": "ACTIVITY", "name": "Museum XYZ", "order": 1},
#       {"type": "STAY", "name": "Hotel Downtown", "order": 2}
#     ]
#   }]
# }
```

### Step 5: Fetch Journey and Verify Order

```bash
# Replace {journey-id} with the ID from Step 4
curl http://localhost:3000/api/journeys/{journey-id} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Verify the response shows places in correct order:
# [
#   {"type": "FOOD", "order": 0},      ✅ First
#   {"type": "ACTIVITY", "order": 1},  ✅ Second
#   {"type": "STAY", "order": 2}       ✅ Third
# ]
#
# NOT sorted by type (would be ACTIVITY, FOOD, STAY)
```

### Step 6: Check Database Directly

```sql
-- Replace 'YOUR_JOURNEY_ID' with actual journey ID
SELECT
  jdp.id,
  jdp.type,
  jdp.name,
  jdp."order",
  jd."dayNumber"
FROM journey_day_place jdp
INNER JOIN journey_day jd ON jdp."journeyDayId" = jd.id
WHERE jd."journeyId" = 'YOUR_JOURNEY_ID'
ORDER BY jd."dayNumber" ASC, jdp."order" ASC;

-- Expected output:
-- id        | type     | name              | order | dayNumber
-- ----------|----------|-------------------|-------|----------
-- uuid-1    | FOOD     | Restaurant ABC    | 0     | 0
-- uuid-2    | ACTIVITY | Museum XYZ        | 1     | 0
-- uuid-3    | STAY     | Hotel Downtown    | 2     | 0
```

---

## Test with Frontend

### Step 7: Test Full End-to-End Flow

1. **Start Frontend**:
   ```bash
   cd /Users/sarangtandel/Documents/Code/Vraj/Viargos/viargos-fe
   npm run dev
   ```

2. **Create Journey**:
   - Navigate to `http://localhost:3001/create-journey`
   - Add places: ACTIVITY → STAY → FOOD
   - Drag to reorder: FOOD → ACTIVITY → STAY
   - Save journey

3. **Check Network Tab**:
   - Open DevTools → Network
   - Find POST `/api/journeys` request
   - Check payload includes: `{"order": 0}, {"order": 1}, {"order": 2}`

4. **View Journey**:
   - Navigate to `/journey/{id}`
   - Timeline should show: FOOD → ACTIVITY → STAY ✅
   - Map polyline should connect: FOOD → ACTIVITY → STAY ✅

5. **Refresh Page**:
   - Reload the page
   - Order should persist ✅

---

## Rollback (If Needed)

If you encounter any issues:

```bash
# Rollback the migration
cd /Users/sarangtandel/Documents/Code/Vraj/Viargos/viargos-be
npm run typeorm migration:revert

# This will:
# - Remove the 'order' column from journey_day_place table
# - Revert to previous state
```

---

## Verification Checklist

- [ ] Migration ran successfully
- [ ] `order` column exists in `journey_day_place` table
- [ ] Backend starts without errors
- [ ] Can create journey with `order` field
- [ ] GET request returns places sorted by `order`
- [ ] Database shows correct order values
- [ ] Frontend displays correct order
- [ ] Order persists after page refresh

---

## Success Criteria

✅ **Backend**:
- POST `/api/journeys` accepts `order` field
- Database stores `order` values (0, 1, 2, ...)
- GET `/api/journeys/:id` returns places sorted by `order ASC`

✅ **Frontend**:
- Sends `order` in payload
- Receives `order` in response
- Displays places in correct drag order

✅ **Full Flow**:
- Drag FOOD to position 0 → Saves as order: 0
- View journey → Shows FOOD first
- Refresh page → Order persists

---

## Common Issues

### Issue: Migration Fails

**Error**: `column "order" already exists`

**Solution**: Column was already added. Skip migration or drop column first:
```sql
ALTER TABLE journey_day_place DROP COLUMN "order";
```
Then run migration again.

---

### Issue: TypeORM Can't Find Migration

**Error**: `No migrations found`

**Solution**: Check `ormconfig` or `data-source.ts` has correct migration path:
```typescript
migrations: ['src/migrations/**/*.ts'],
cli: {
  migrationsDir: 'src/migrations',
},
```

---

### Issue: Order Field Not in Response

**Possible Causes**:
1. Migration didn't run → Run `npm run typeorm migration:run`
2. Entity not updated → Check entity has `@Column() order: number;`
3. Old data without order → Backfill query should have set default values

**Solution**: Verify all steps completed and restart backend.

---

## Next Steps

Once testing is complete:
1. Commit changes to git
2. Deploy to staging environment
3. Test in staging
4. Deploy to production

**Deployment Command**:
```bash
git add .
git commit -m "feat: add order field to journey places for drag-and-drop persistence"
git push origin main
```

---

## Support

If you encounter issues:
1. Check backend logs: `npm run start:dev` console output
2. Check database: Run SQL queries above
3. Verify migration: `npm run typeorm migration:show`
4. Review implementation: See comprehensive plan at `/Users/sarangtandel/.claude/plans/comprehensive-order-field-implementation.md`
