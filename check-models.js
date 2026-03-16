const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
  console.log('Verifying Gemini API Key and Listing Models...');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  try {
    // There isn't a direct "listModels" in the standard high-level library easily surfaced
    // But we can try to initialize a model and check its metadata if possible, 
    // or just try a few known variations.
    
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];
    
    for (const modelName of models) {
      console.log(`Checking access to: ${modelName}...`);
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hi");
        console.log(`✅ Success with ${modelName}`);
        return; // Exit if one works
      } catch (e) {
        console.log(`❌ Failed with ${modelName}: ${e.message} (Status: ${e.status})`);
      }
    }
  } catch (error) {
    console.error('Fatal Error during model listing:', error);
  }
}

listModels();
