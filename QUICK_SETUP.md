# 🚀 Quick Setup Guide - Dashboard API with Sample Data

## 🎯 Goal
Set up the Dashboard API with 15 sample posts for testing infinite scroll functionality.

## 📋 Steps

### 1. **Start the Server**
```bash
npm run start:dev
```
*Server will start at `http://localhost:3000`*

### 2. **Create/Login User Account**

#### Option A: Create New Account
```bash
curl -X POST "http://localhost:3000/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@viargos.com",
    "password": "password123",
    "phoneNumber": "+1234567890"
  }'
```

#### Option B: Login with Existing Account
```bash
curl -X POST "http://localhost:3000/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@viargos.com",
    "password": "password123"
  }'
```

**Save the JWT token from response!**

### 3. **Create Sample Posts**

#### Option A: Automated Script (Recommended)
```bash
# Edit credentials in the script
nano create-sample-posts.sh

# Update these lines with your credentials:
# EMAIL="test@viargos.com"
# PASSWORD="password123"

# Run the script
./create-sample-posts.sh
```

#### Option B: Manual Creation
Follow the curl commands in `sample-posts-curl.md` file.

### 4. **Test Dashboard API**

#### Get First Page
```bash
export TOKEN="your_jwt_token_here"

curl -X GET "http://localhost:3000/api/dashboard?limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

#### Test Infinite Scroll
```bash
# Use the nextCursor from previous response
curl -X GET "http://localhost:3000/api/dashboard?cursor=CURSOR_ID&limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

#### Test Search & Filters
```bash
# Search for "beach" posts
curl -X GET "http://localhost:3000/api/dashboard?search=beach&limit=3" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Filter by Japan locations
curl -X GET "http://localhost:3000/api/dashboard?location=Japan&limit=3" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

## 🎉 Expected Results

After running the setup:

✅ **15 diverse travel posts** created  
✅ **Dashboard API** returns paginated results  
✅ **Infinite scroll** works with cursor-based pagination  
✅ **Search functionality** works across descriptions  
✅ **Location filtering** works  
✅ **User like status** included in response  

## 📊 Sample Response Format

```json
{
  "statusCode": 10000,
  "message": "Dashboard posts retrieved successfully",
  "data": {
    "posts": [
      {
        "id": "uuid",
        "description": "🏖️ Amazing sunset at Kuta Beach!...",
        "likeCount": 0,
        "commentCount": 0,
        "location": "Kuta Beach, Bali, Indonesia",
        "latitude": -8.7203,
        "longitude": 115.1693,
        "isLikedByUser": false,
        "user": {
          "id": "user-uuid",
          "username": "testuser",
          "profileImage": null
        },
        "media": [],
        "journey": null
      }
    ],
    "hasMore": true,
    "nextCursor": "next-uuid",
    "totalCount": 15
  }
}
```

## 🛠️ Troubleshooting

### Common Issues:

1. **Server not starting**: Check if port 3000 is available
2. **Login fails**: Verify email/password or create new account
3. **Posts not created**: Check JWT token expiration
4. **Database connection**: Verify PostgreSQL connection in `.env`

### Quick Fixes:

```bash
# Check server status
curl -s "http://localhost:3000/api-docs" | head -5

# Verify JWT token
echo $TOKEN | cut -c1-20

# Check posts count
curl -s -X GET "http://localhost:3000/api/dashboard?limit=1" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.totalCount'
```

## 📱 Frontend Integration

The dashboard API is ready for mobile/web integration:

- **React Native**: Use FlatList with `onEndReached`
- **React Web**: Use intersection observer or scroll events
- **Flutter**: Use ListView.builder with scroll controller
- **Vue/Angular**: Similar scroll-based implementations

## 📚 Documentation

- **Full API Docs**: `DASHBOARD_API.md`
- **Swagger UI**: `http://localhost:3000/api-docs`
- **Sample Data**: Created with realistic travel content
- **Curl Examples**: `sample-posts-curl.md`

## 🚀 Next Steps

1. **Add Media**: Use POST `/api/posts/media` to upload images
2. **Like Posts**: Use POST `/api/posts/:id/like`
3. **Add Comments**: Use POST `/api/posts/:id/comments`
4. **Test Journeys**: Create journey-linked posts
5. **Mobile Testing**: Test with actual mobile app

---

**Happy coding! 🎉** The dashboard API is now ready for infinite scroll testing with realistic travel data.
