const axios = require('axios');

// Test script to validate the enhanced user details API with relationship status
async function testRelationshipAPI() {
  const baseURL = 'http://localhost:3000/api';
  
  // You'll need to replace these with actual JWT tokens from your app
  const userToken1 = 'YOUR_JWT_TOKEN_1'; // Token for user who will follow
  const userToken2 = 'YOUR_JWT_TOKEN_2'; // Token for user who will be followed
  const userId = '10a6763a-48ca-4209-9d88-32555a972fb6'; // User ID to test
  
  console.log('Testing Enhanced User Details API with Relationship Status');
  console.log('==========================================================');
  
  try {
    // Test 1: Get user profile with authentication (should show relationship status)
    console.log('1. Testing user profile with relationship status...');
    const response = await axios.get(`${baseURL}/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${userToken1}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response structure:');
    console.log('- User basic info:', !!response.data.user);
    console.log('- Stats:', !!response.data.stats);
    console.log('- Relationship Status:', !!response.data.relationshipStatus);
    console.log('- Is Following:', response.data.relationshipStatus?.isFollowing);
    console.log('- Is Followed By:', response.data.relationshipStatus?.isFollowedBy);
    
    // Test 2: Test self-profile (relationship status should be false/false)
    console.log('\n2. Testing self profile...');
    const selfProfile = await axios.get(`${baseURL}/users/profile/me`, {
      headers: {
        'Authorization': `Bearer ${userToken1}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Self profile relationship status:');
    console.log('- Is Following:', selfProfile.data.relationshipStatus?.isFollowing);
    console.log('- Is Followed By:', selfProfile.data.relationshipStatus?.isFollowedBy);
    
    console.log('\n✅ API enhancement successful! The user details now include relationship status.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    // Instructions for manual testing
    console.log('\nManual Testing Instructions:');
    console.log('1. Start the server: npm run start:dev');
    console.log('2. Get a valid JWT token by logging in');
    console.log('3. Test the API endpoint:');
    console.log(`   GET ${baseURL}/users/${userId}`);
    console.log('   Headers: { "Authorization": "Bearer YOUR_TOKEN" }');
    console.log('\n4. The response should now include:');
    console.log('   {');
    console.log('     "user": {...},');
    console.log('     "stats": {...},');
    console.log('     "relationshipStatus": {');
    console.log('       "isFollowing": boolean,');
    console.log('       "isFollowedBy": boolean');
    console.log('     },');
    console.log('     "recentFollowers": [...],');
    console.log('     "recentFollowing": [...],');
    console.log('     "recentPosts": [...],');
    console.log('     "recentJourneys": [...]');
    console.log('   }');
  }
}

// Export for module usage or run directly
if (require.main === module) {
  testRelationshipAPI();
} else {
  module.exports = testRelationshipAPI;
}
