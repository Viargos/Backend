# User Relationship Status API Enhancement

## Overview
Enhanced the user details API (`GET /api/users/{id}`) to include relationship status information showing whether the current authenticated user is following the requested user and vice versa.

## Changes Made

### 1. UserRelationshipService Enhancement
**File:** `src/modules/user/user-relationship.service.ts`

Added new method:
```typescript
async getRelationshipStatus(currentUserId: string, targetUserId: string): Promise<{
  isFollowing: boolean;
  isFollowedBy: boolean;
}> 
```

This method:
- Returns `{isFollowing: false, isFollowedBy: false}` if no current user or if checking own profile
- Efficiently queries relationship status in parallel using `Promise.all`
- Checks both directions of the relationship

### 2. DTO Enhancement  
**File:** `src/modules/user/dto/user-profile-response.dto.ts`

Added new DTO class:
```typescript
export class RelationshipStatusDto {
  @ApiProperty({ description: 'Whether current user is following this user' })
  isFollowing: boolean;

  @ApiProperty({ description: 'Whether this user is following current user back' })
  isFollowedBy: boolean;
}
```

Updated `UserProfileResponseDto`:
- Added `relationshipStatus: RelationshipStatusDto` field
- Updated constructor to accept relationship status parameter
- Added proper Swagger API documentation

### 3. UserService Enhancement
**File:** `src/modules/user/user.service.ts`

Modified `getUserProfile` method:
- Added optional `currentUserId` parameter
- Fetches relationship status in parallel with other data for optimal performance
- Handles cases where no current user is provided (returns default false values)

### 4. UserController Enhancement  
**File:** `src/modules/user/user.controller.ts`

Updated endpoints:
- `GET /users/{id}` - Now passes current user ID to get relationship status
- `GET /users/profile/me` - Updated to pass current user ID for consistency

Fixed parameter ordering to comply with TypeScript requirements.

## API Response Structure

The enhanced API now returns:

```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "bio": "string",
    "profileImage": "string",
    "bannerImage": "string",
    "location": "string",
    "isActive": boolean,
    "createdAt": "date",
    "updatedAt": "date"
  },
  "stats": {
    "followersCount": number,
    "followingCount": number,
    "postsCount": number,
    "journeysCount": number
  },
  "relationshipStatus": {
    "isFollowing": boolean,
    "isFollowedBy": boolean
  },
  "recentFollowers": [...],
  "recentFollowing": [...],
  "recentPosts": [...],
  "recentJourneys": [...]
}
```

## Usage Examples

### Get User Profile with Relationship Status
```bash
curl -X GET "http://localhost:3000/api/users/10a6763a-48ca-4209-9d88-32555a972fb6" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Response Scenarios

1. **User A viewing User B (A follows B)**
   ```json
   "relationshipStatus": {
     "isFollowing": true,
     "isFollowedBy": false
   }
   ```

2. **User A viewing User B (mutual follow)**
   ```json
   "relationshipStatus": {
     "isFollowing": true,
     "isFollowedBy": true
   }
   ```

3. **User A viewing their own profile**
   ```json
   "relationshipStatus": {
     "isFollowing": false,
     "isFollowedBy": false
   }
   ```

## Performance Considerations

- Relationship status is fetched in parallel with other profile data using `Promise.all`
- Uses existing optimized database queries from `UserRelationshipRepository`
- No additional database round trips introduced

## Testing

1. **Build Test**: `npm run build` ✅
2. **Manual Testing**: Use the provided `test-relationship-api.js` script
3. **Integration**: Test with actual JWT tokens and user relationships

## Backward Compatibility

- All existing API endpoints remain unchanged in functionality
- New relationship status field is always included in comprehensive user profiles
- Basic user endpoint (`/users/{id}/basic`) remains unaffected

## Security

- Relationship status only shown to authenticated users
- Current user's JWT token is required to determine relationship context
- No sensitive data exposed in relationship status

## Future Enhancements

Potential future improvements:
- Add relationship status to user search results
- Include relationship timestamps (when started following)
- Add relationship status to bulk user operations
- Cache relationship status for frequently accessed profiles
