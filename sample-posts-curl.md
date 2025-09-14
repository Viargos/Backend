# Sample Posts Creation - Curl Commands

## Prerequisites

1. Start the server: `npm run start:dev`
2. Create/Login to get JWT token
3. Replace `YOUR_JWT_TOKEN` with actual token

## Step 1: Login to Get Token

```bash
# Replace with your actual credentials
curl -X POST "http://localhost:3000/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

Copy the `access_token` from response and use it in the commands below.

## Step 2: Create Sample Posts

### Post 1: Bali Sunset
```bash
curl -X POST "http://localhost:3000/api/posts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "🏖️ Amazing sunset at Kuta Beach! The colors were absolutely breathtaking. Nothing beats a Bali sunset with the sound of waves crashing nearby.",
    "location": "Kuta Beach, Bali, Indonesia",
    "latitude": -8.7203,
    "longitude": 115.1693
  }'
```

### Post 2: Paris Eiffel Tower
```bash
curl -X POST "http://localhost:3000/api/posts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "🗼 Finally made it to the Eiffel Tower! The view from Trocadéro is incredible. Paris, you have my heart ❤️",
    "location": "Eiffel Tower, Paris, France",
    "latitude": 48.8584,
    "longitude": 2.2945
  }'
```

### Post 3: Tokyo Ramen
```bash
curl -X POST "http://localhost:3000/api/posts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "🍜 Best ramen I have ever had! This little shop in Shibuya serves the most authentic tonkotsu ramen. The broth is rich and creamy perfection.",
    "location": "Shibuya, Tokyo, Japan",
    "latitude": 35.6598,
    "longitude": 139.7006
  }'
```

### Post 4: Swiss Alps
```bash
curl -X POST "http://localhost:3000/api/posts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "🏔️ Hiking in the Swiss Alps today! The fresh mountain air and stunning views make every step worth it. Nature therapy at its finest.",
    "location": "Matterhorn, Zermatt, Switzerland",
    "latitude": 45.9763,
    "longitude": 7.6586
  }'
```

### Post 5: Buenos Aires Street Art
```bash
curl -X POST "http://localhost:3000/api/posts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "🎭 Exploring the vibrant street art scene in Buenos Aires. Every corner tells a story through incredible murals and graffiti. Art is everywhere!",
    "location": "La Boca, Buenos Aires, Argentina",
    "latitude": -34.6347,
    "longitude": -58.3634
  }'
```

### Post 6: Safari Adventure
```bash
curl -X POST "http://localhost:3000/api/posts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "🐘 Safari adventure in Kruger National Park! Spotted a family of elephants just 20 meters away. Wildlife photography has never been more thrilling.",
    "location": "Kruger National Park, South Africa",
    "latitude": -24.0058,
    "longitude": 31.4972
  }'
```

### Post 7: Bondi Beach Surfing
```bash
curl -X POST "http://localhost:3000/api/posts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "🌊 Surfing lessons at Bondi Beach! Wiped out more times than I can count, but finally caught my first wave. Australia, you are amazing!",
    "location": "Bondi Beach, Sydney, Australia",
    "latitude": -33.8915,
    "longitude": 151.2767
  }'
```

### Post 8: Naples Pizza
```bash
curl -X POST "http://localhost:3000/api/posts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "🍕 Pizza margherita in Naples - where pizza was born! The simplicity of fresh tomatoes, mozzarella, and basil is pure perfection.",
    "location": "Historic Center, Naples, Italy",
    "latitude": 40.8518,
    "longitude": 14.2681
  }'
```

### Post 9: Machu Picchu
```bash
curl -X POST "http://localhost:3000/api/posts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "🏛️ Walking through the ancient ruins of Machu Picchu at sunrise. The Inca Trail was challenging but this moment makes it all worthwhile.",
    "location": "Machu Picchu, Cusco, Peru",
    "latitude": -13.1631,
    "longitude": -72.5450
  }'
```

### Post 10: Kyoto Cherry Blossoms
```bash
curl -X POST "http://localhost:3000/api/posts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "🌸 Cherry blossom season in Kyoto! Philosopher Path is lined with sakura trees in full bloom. Spring in Japan is magical.",
    "location": "Philosopher Path, Kyoto, Japan",
    "latitude": 35.0184,
    "longitude": 135.7936
  }'
```

### Post 11: Bangkok Night Market
```bash
curl -X POST "http://localhost:3000/api/posts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "🎪 Night market adventures in Bangkok! The street food here is incredible - pad thai, mango sticky rice, and so much more. Food heaven!",
    "location": "Chatuchak Night Market, Bangkok, Thailand",
    "latitude": 13.7997,
    "longitude": 100.5510
  }'
```

### Post 12: Maya Bay
```bash
curl -X POST "http://localhost:3000/api/posts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "🏖️ Crystal clear waters at Maya Bay! This place looks like paradise. The limestone cliffs and turquoise water are absolutely stunning.",
    "location": "Maya Bay, Phi Phi Islands, Thailand",
    "latitude": 7.6761,
    "longitude": 98.7668
  }'
```

### Post 13: Amsterdam Museums
```bash
curl -X POST "http://localhost:3000/api/posts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "🎨 Museum hopping in Amsterdam! The Van Gogh Museum and Rijksmuseum are incredible. Dutch art and culture are fascinating.",
    "location": "Museum Quarter, Amsterdam, Netherlands",
    "latitude": 52.3598,
    "longitude": 4.8818
  }'
```

### Post 14: Mount Vesuvius
```bash
curl -X POST "http://localhost:3000/api/posts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "🌋 Hiking up Mount Vesuvius! The view of the Bay of Naples from the crater rim is spectacular. History and nature combined.",
    "location": "Mount Vesuvius, Naples, Italy",
    "latitude": 40.8203,
    "longitude": 14.4260
  }'
```

### Post 15: Neuschwanstein Castle
```bash
curl -X POST "http://localhost:3000/api/posts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "🏰 Exploring the fairy tale castles of Bavaria! Neuschwanstein Castle looks like it came straight out of a Disney movie. Absolutely magical!",
    "location": "Neuschwanstein Castle, Bavaria, Germany",
    "latitude": 47.5576,
    "longitude": 10.7498
  }'
```

## Step 3: Test Dashboard API

After creating the posts, test the dashboard:

```bash
# Get first page
curl -X GET "http://localhost:3000/api/dashboard?limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq '.'

# Test with search
curl -X GET "http://localhost:3000/api/dashboard?search=beach&limit=3" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq '.'

# Test with location filter
curl -X GET "http://localhost:3000/api/dashboard?location=Japan&limit=3" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq '.'
```

## Automated Script

For automated creation, use the bash script:

```bash
# Edit the email and password in the script first
nano create-sample-posts.sh

# Then run it
./create-sample-posts.sh
```
