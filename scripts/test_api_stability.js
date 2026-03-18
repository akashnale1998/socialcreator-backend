const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
// In a real test, we would use a test token. 
// For this audit verification, we are checking for proper error handling and status codes.

async function testEndpoint(name, path, method = 'post', data = {}) {
  console.log(`\nTesting ${name}...`);
  try {
    const config = {
      method,
      url: `${API_URL}/${path}`,
      data,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await axios(config);
    console.log(`✅ ${name} Success (Status: ${response.status})`);
  } catch (error) {
    const status = error.response ? error.response.status : 'NO_RESPONSE';
    const message = error.response ? JSON.stringify(error.response.data) : error.message;

    if (status === 401 || status === 403 || status === 429 || status === 400) {
      console.log(`ℹ️ ${name} handled predictably (Status: ${status}): ${message}`);
    } else {
      console.log(`❌ ${name} Unexpected Error (Status: ${status}): ${message}`);
    }
  }
}

async function runTests() {
  console.log('Starting API Stability & Error Handling Audit Tests...');

  // Test 1: Empty Topic for Hashtag Generator
  await testEndpoint('Hashtag Generator (Empty)', 'ai/generate-hashtags', 'post', { topic: '' });

  // Test 2: Invalid Link for Video Analysis (No Auth)
  await testEndpoint('Video Analysis (No Auth)', 'ai/analyze-video-viral-score', 'post', {});

  // Test 3: Daily Viral Ideas (Check consistency)
  await testEndpoint('Daily Viral Ideas', 'ai/daily-viral-ideas', 'get');

  // Test 4: Profile Analyzer (No File)
  await testEndpoint('Profile Analyzer (No File)', 'ai/analyze-profile', 'post', {});

  console.log('\nAudit Testing Completed.');
}

if (require.main === module) {
  runTests();
}
