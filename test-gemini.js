const { generateContent } = require('./services/gemini');
require('dotenv').config();

async function testGemini() {
  console.log('Testing Gemini API integration...');
  console.log('Using API Key:', process.env.GEMINI_API_KEY ? 'Set (Hidden)' : 'Not Set');
  
  const testPrompt = 'Write a short, viral hook for a video about "AI Productivity Tools".';
  
  try {
    console.log('Sending prompt to Gemini...');
    const result = await generateContent(testPrompt);
    console.log('\n--- AI RESPONSE ---');
    console.log(result);
    console.log('-------------------\n');
    console.log('Test Successful! ✅');
  } catch (error) {
    console.error('\nTest Failed! ❌');
    console.error('Error Status:', error.status);
    console.error('Error Message:', error.message);
    if (error.response) {
      console.error('Response Data:', error.response.data);
    } else {
      console.error('Full Error:', error);
    }
  }
}

testGemini();
