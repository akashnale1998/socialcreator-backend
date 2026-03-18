const axios = require('axios');

async function testGuestAccess() {
  console.log("Testing Guest Access for /api/ai/generate-caption...");

  try {
    const response = await axios.post('http://localhost:5000/api/ai/generate-caption', {
      topic: "Space exploration",
      tone: "inspiring",
      platform: "instagram"
    }, {
      headers: {
        'x-demo-id': 'test-guest-' + Date.now()
      }
    });

    console.log("Status:", response.status);
    console.log("Data Received:", !!response.data);
    if (response.data.options) {
      console.log("✅ Success: Options received.");
    } else {
      console.log("❌ Failed: No options in response.");
    }
  } catch (error) {
    if (error.response) {
      console.log("Error Status:", error.response.status);
      console.log("Error Message:", error.response.data.error);
      if (error.response.status === 429) {
        console.log("ℹ️ Demo limit reached (Expected if tested many times).");
      } else {
        console.log("❌ Failed: Unexpected error status.");
      }
    } else {
      console.log("❌ Failed to connect:", error.message);
    }
  }
}

testGuestAccess();
