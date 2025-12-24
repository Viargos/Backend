#!/bin/bash

# Create Sample Posts Script for Viargos Backend
# This script creates 15 diverse sample posts using the API

# set -e  # Exit on any error (commented out to continue on errors)

# Configuration
BASE_URL="http://localhost:3000/api"
EMAIL="sarang@gmail.com"  # Replace with your actual email
PASSWORD="Sarang@123"        # Replace with your actual password

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Viargos Sample Posts Creator${NC}"
echo "================================="

# Step 1: Login to get JWT token
echo -e "${YELLOW}🔐 Logging in...${NC}"

LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed!${NC}"
  echo "Response: $LOGIN_RESPONSE"
  echo ""
  echo -e "${YELLOW}Please make sure:${NC}"
  echo "1. The server is running (npm run start:dev)"
  echo "2. You have a registered user account"
  echo "3. Update EMAIL and PASSWORD variables in this script"
  echo ""
  echo -e "${BLUE}To create a user account:${NC}"
  echo "curl -X POST \"$BASE_URL/auth/signup\" \\"
  echo "  -H \"Content-Type: application/json\" \\"
  echo "  -d '{"
  echo "    \"username\": \"testuser\","
  echo "    \"email\": \"test@example.com\","
  echo "    \"password\": \"password123\","
  echo "    \"phoneNumber\": \"+1234567890\""
  echo "  }'"
  exit 1
fi

echo -e "${GREEN}✅ Login successful!${NC} Token: ${TOKEN:0:20}..."

# Sample posts data
declare -a POSTS=(
  '{
    "description": "🏖️ Amazing sunset at Kuta Beach! The colors were absolutely breathtaking. Nothing beats a Bali sunset with the sound of waves crashing nearby.",
    "location": "Kuta Beach, Bali, Indonesia",
    "latitude": -8.7203,
    "longitude": 115.1693
  }'
  '{
    "description": "🗼 Finally made it to the Eiffel Tower! The view from Trocadéro is incredible. Paris, you have my heart ❤️",
    "location": "Eiffel Tower, Paris, France",
    "latitude": 48.8584,
    "longitude": 2.2945
  }'
  '{
    "description": "🍜 Best ramen I have ever had! This little shop in Shibuya serves the most authentic tonkotsu ramen. The broth is rich and creamy perfection.",
    "location": "Shibuya, Tokyo, Japan",
    "latitude": 35.6598,
    "longitude": 139.7006
  }'
  '{
    "description": "🏔️ Hiking in the Swiss Alps today! The fresh mountain air and stunning views make every step worth it. Nature therapy at its finest.",
    "location": "Matterhorn, Zermatt, Switzerland",
    "latitude": 45.9763,
    "longitude": 7.6586
  }'
  '{
    "description": "🎭 Exploring the vibrant street art scene in Buenos Aires. Every corner tells a story through incredible murals and graffiti. Art is everywhere!",
    "location": "La Boca, Buenos Aires, Argentina",
    "latitude": -34.6347,
    "longitude": -58.3634
  }'
  '{
    "description": "🐘 Safari adventure in Kruger National Park! Spotted a family of elephants just 20 meters away. Wildlife photography has never been more thrilling.",
    "location": "Kruger National Park, South Africa",
    "latitude": -24.0058,
    "longitude": 31.4972
  }'
  '{
    "description": "🌊 Surfing lessons at Bondi Beach! Wiped out more times than I can count, but finally caught my first wave. Australia, you are amazing!",
    "location": "Bondi Beach, Sydney, Australia",
    "latitude": -33.8915,
    "longitude": 151.2767
  }'
  '{
    "description": "🍕 Pizza margherita in Naples - where pizza was born! The simplicity of fresh tomatoes, mozzarella, and basil is pure perfection.",
    "location": "Historic Center, Naples, Italy",
    "latitude": 40.8518,
    "longitude": 14.2681
  }'
  '{
    "description": "🏛️ Walking through the ancient ruins of Machu Picchu at sunrise. The Inca Trail was challenging but this moment makes it all worthwhile.",
    "location": "Machu Picchu, Cusco, Peru",
    "latitude": -13.1631,
    "longitude": -72.5450
  }'
  '{
    "description": "🌸 Cherry blossom season in Kyoto! Philosopher Path is lined with sakura trees in full bloom. Spring in Japan is magical.",
    "location": "Philosopher Path, Kyoto, Japan",
    "latitude": 35.0184,
    "longitude": 135.7936
  }'
  '{
    "description": "🎪 Night market adventures in Bangkok! The street food here is incredible - pad thai, mango sticky rice, and so much more. Food heaven!",
    "location": "Chatuchak Night Market, Bangkok, Thailand",
    "latitude": 13.7997,
    "longitude": 100.5510
  }'
  '{
    "description": "🏖️ Crystal clear waters at Maya Bay! This place looks like paradise. The limestone cliffs and turquoise water are absolutely stunning.",
    "location": "Maya Bay, Phi Phi Islands, Thailand",
    "latitude": 7.6761,
    "longitude": 98.7668
  }'
  '{
    "description": "🎨 Museum hopping in Amsterdam! The Van Gogh Museum and Rijksmuseum are incredible. Dutch art and culture are fascinating.",
    "location": "Museum Quarter, Amsterdam, Netherlands",
    "latitude": 52.3598,
    "longitude": 4.8818
  }'
  '{
    "description": "🌋 Hiking up Mount Vesuvius! The view of the Bay of Naples from the crater rim is spectacular. History and nature combined.",
    "location": "Mount Vesuvius, Naples, Italy",
    "latitude": 40.8203,
    "longitude": 14.4260
  }'
  '{
    "description": "🏰 Exploring the fairy tale castles of Bavaria! Neuschwanstein Castle looks like it came straight out of a Disney movie. Absolutely magical!",
    "location": "Neuschwanstein Castle, Bavaria, Germany",
    "latitude": 47.5576,
    "longitude": 10.7498
  }'
)

echo -e "${BLUE}📝 Creating ${#POSTS[@]} sample posts...${NC}"
echo ""

# Create posts with progress indicator
COUNTER=1
SUCCESS_COUNT=0
FAILED_COUNT=0

for post_data in "${POSTS[@]}"; do
  echo -e "${YELLOW}Creating post $COUNTER/${#POSTS[@]}...${NC}"
  
  # Extract location for display
  LOCATION=$(echo $post_data | jq -r '.location')
  echo -e "${BLUE}📍 Location: $LOCATION${NC}"
  
  # Make API call
  RESPONSE=$(curl -s -X POST "$BASE_URL/posts" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$post_data")
  
  # Check if successful
  if echo $RESPONSE | jq -e '.id' > /dev/null 2>&1; then
    POST_ID=$(echo $RESPONSE | jq -r '.id')
    echo -e "${GREEN}✅ Post created successfully! ID: ${POST_ID:0:8}...${NC}"
    ((SUCCESS_COUNT++))
  else
    echo -e "${RED}❌ Failed to create post${NC}"
    echo "Response: $RESPONSE"
    ((FAILED_COUNT++))
  fi
  
  echo ""
  ((COUNTER++))
  
  # Small delay to avoid overwhelming the server
  sleep 0.5
done

echo "================================="
echo -e "${GREEN}🎉 Sample posts creation completed!${NC}"
echo -e "${GREEN}✅ Successfully created: $SUCCESS_COUNT posts${NC}"
if [ $FAILED_COUNT -gt 0 ]; then
  echo -e "${RED}❌ Failed to create: $FAILED_COUNT posts${NC}"
fi
echo ""

# Test the dashboard API
echo -e "${BLUE}🧪 Testing Dashboard API...${NC}"
DASHBOARD_RESPONSE=$(curl -s -X GET "$BASE_URL/dashboard?limit=5" \
  -H "Authorization: Bearer $TOKEN")

POST_COUNT=$(echo $DASHBOARD_RESPONSE | jq '.data.posts | length')
TOTAL_COUNT=$(echo $DASHBOARD_RESPONSE | jq '.data.totalCount')
HAS_MORE=$(echo $DASHBOARD_RESPONSE | jq '.data.hasMore')

echo -e "${GREEN}📊 Dashboard API Results:${NC}"
echo "  Posts in response: $POST_COUNT"
echo "  Total posts count: $TOTAL_COUNT"
echo "  Has more posts: $HAS_MORE"

if [ "$POST_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ Dashboard API is working correctly!${NC}"
else
  echo -e "${RED}❌ Dashboard API returned no posts${NC}"
fi

echo ""
echo -e "${BLUE}🚀 You can now test the Dashboard API with:${NC}"
echo "curl -X GET \"$BASE_URL/dashboard?limit=10\" \\"
echo "  -H \"Authorization: Bearer $TOKEN\" | jq '.'"
echo ""
echo -e "${YELLOW}💡 Pro tip: Open Swagger UI at http://localhost:3000/api-docs to explore all APIs!${NC}"
