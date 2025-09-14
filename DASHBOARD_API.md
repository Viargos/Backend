# Dashboard API Documentation

## Overview

The Dashboard API (`GET /api/dashboard`) provides a paginated endpoint for fetching posts with infinite scroll support. This API is perfect for mobile apps and web applications that need to implement scroll-to-load-more functionality.

## Features

✅ **Cursor-based Pagination** - More reliable than offset-based pagination  
✅ **Infinite Scroll Support** - Perfect for mobile apps  
✅ **User Like Status** - Includes whether the current user liked each post  
✅ **Search & Filtering** - Filter by location and search in descriptions  
✅ **Optimized Queries** - Efficient database queries with proper indexing  
✅ **Rich Post Data** - Includes user info, media, journey links, and counts  

## Endpoint

```
GET /api/dashboard
```

## Authentication

**Required**: Bearer JWT Token in Authorization header

```
Authorization: Bearer <your-jwt-token>
```

## Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `cursor` | string | No | Cursor for pagination (ID of last post from previous request) | `"123e4567-e89b-12d3-a456-426614174000"` |
| `limit` | number | No | Number of posts per page (1-50, default: 20) | `20` |
| `location` | string | No | Filter posts by location (case-insensitive partial match) | `"Bali"` |
| `search` | string | No | Search in post descriptions (case-insensitive partial match) | `"sunset"` |

## Response Format

```json
{
  "statusCode": 10000,
  "message": "Dashboard posts retrieved successfully",
  "data": {
    "posts": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "description": "Amazing sunset at the beach!",
        "likeCount": 42,
        "commentCount": 8,
        "location": "Bali, Indonesia",
        "latitude": -8.3405,
        "longitude": 115.0920,
        "createdAt": "2024-01-15T18:30:00.000Z",
        "updatedAt": "2024-01-15T19:00:00.000Z",
        "isLikedByUser": true,
        "user": {
          "id": "user-uuid",
          "username": "traveler123",
          "email": "user@example.com",
          "profileImage": "https://s3.amazonaws.com/bucket/profile.jpg",
          "bio": "Travel enthusiast",
          "location": "San Francisco, CA"
        },
        "media": [
          {
            "id": "media-uuid",
            "type": "image",
            "url": "https://s3.amazonaws.com/bucket/post-image.jpg",
            "thumbnailUrl": "https://s3.amazonaws.com/bucket/post-thumb.jpg",
            "order": 1
          }
        ],
        "journey": {
          "id": "journey-uuid",
          "title": "Southeast Asia Adventure",
          "description": "30-day journey through Thailand, Vietnam, and Indonesia"
        }
      }
    ],
    "hasMore": true,
    "nextCursor": "123e4567-e89b-12d3-a456-426614174001",
    "totalCount": 150
  }
}
```

## Response Fields

### Root Response
- `statusCode`: HTTP status code (200 for success)
- `message`: Success message
- `data`: Main data object

### Data Object
- `posts`: Array of post objects
- `hasMore`: Boolean indicating if more posts are available
- `nextCursor`: Cursor for next page (use in next request)
- `totalCount`: Total number of posts (only on first request without cursor)

### Post Object
- `id`: Unique post identifier
- `description`: Post content
- `likeCount`: Number of likes
- `commentCount`: Number of comments
- `location`: Location name (optional)
- `latitude`/`longitude`: GPS coordinates (optional)
- `createdAt`/`updatedAt`: Timestamps
- `isLikedByUser`: Whether current user liked this post
- `user`: Post author information
- `media`: Array of attached images/videos
- `journey`: Associated journey information (optional)

## Usage Examples

### 1. Initial Load (First Page)

```bash
curl -X GET "http://localhost:3000/api/dashboard?limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Load More Posts (Infinite Scroll)

```bash
curl -X GET "http://localhost:3000/api/dashboard?cursor=123e4567-e89b-12d3-a456-426614174001&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Search Posts

```bash
curl -X GET "http://localhost:3000/api/dashboard?search=sunset&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Filter by Location

```bash
curl -X GET "http://localhost:3000/api/dashboard?location=Bali&limit=15" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Combined Filters

```bash
curl -X GET "http://localhost:3000/api/dashboard?search=beach&location=Indonesia&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Frontend Implementation Examples

### JavaScript/React Implementation

```javascript
class DashboardPosts {
  constructor() {
    this.posts = [];
    this.hasMore = true;
    this.nextCursor = null;
    this.loading = false;
  }

  async loadPosts(reset = false) {
    if (this.loading) return;
    
    this.loading = true;
    
    try {
      const params = new URLSearchParams({
        limit: '20'
      });
      
      if (!reset && this.nextCursor) {
        params.append('cursor', this.nextCursor);
      }
      
      const response = await fetch(`/api/dashboard?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (reset) {
        this.posts = data.data.posts;
      } else {
        this.posts.push(...data.data.posts);
      }
      
      this.hasMore = data.data.hasMore;
      this.nextCursor = data.data.nextCursor;
      
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadMore() {
    if (this.hasMore && !this.loading) {
      await this.loadPosts(false);
    }
  }

  async refresh() {
    await this.loadPosts(true);
  }
}

// Usage
const dashboard = new DashboardPosts();

// Initial load
dashboard.loadPosts(true);

// Infinite scroll handler
window.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
    dashboard.loadMore();
  }
});
```

### React Hook Implementation

```javascript
import { useState, useEffect, useCallback } from 'react';

const useDashboardPosts = () => {
  const [posts, setPosts] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadPosts = useCallback(async (reset = false) => {
    if (loading) return;
    
    setLoading(true);
    
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (!reset && nextCursor) {
        params.append('cursor', nextCursor);
      }
      
      const response = await fetch(`/api/dashboard?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });
      
      const data = await response.json();
      
      setPosts(prev => reset ? data.data.posts : [...prev, ...data.data.posts]);
      setHasMore(data.data.hasMore);
      setNextCursor(data.data.nextCursor);
      
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, nextCursor]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadPosts(false);
    }
  }, [hasMore, loading, loadPosts]);

  const refresh = useCallback(() => {
    loadPosts(true);
  }, [loadPosts]);

  return { posts, hasMore, loading, loadMore, refresh };
};
```

## Error Handling

### Common Error Responses

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

```json
{
  "statusCode": 400,
  "message": ["limit must not be greater than 50"],
  "error": "Bad Request"
}
```

## Performance Considerations

1. **Cursor-based Pagination**: More efficient than offset-based for large datasets
2. **Optimized Queries**: Uses proper JOIN operations and indexes
3. **Selective Loading**: Total count only calculated on first request
4. **Configurable Limits**: Maximum 50 posts per request to prevent abuse

## Database Indexes Recommendations

Ensure these indexes exist for optimal performance:

```sql
-- For cursor-based pagination
CREATE INDEX idx_posts_created_at_id ON posts (created_at DESC, id DESC);

-- For location filtering
CREATE INDEX idx_posts_location ON posts (location);

-- For search functionality (PostgreSQL specific)
CREATE INDEX idx_posts_description_gin ON posts USING gin(to_tsvector('english', description));

-- For user likes join
CREATE INDEX idx_post_likes_user_post ON post_likes (user_id, post_id);
```

## API Testing

You can test this API using the Swagger documentation at `/api-docs` when the server is running, or use the provided curl examples above.
