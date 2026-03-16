// const { GoogleGenerativeAI } = require("@google/generative-ai");
// require('dotenv').config();

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());

// const generateContent = async (prompt) => {
//   try {
//     const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
//     const result = await model.generateContent(prompt);
//     const response = await result.response;
//     return response.text();
//   } catch (error) {
//     console.error("Gemini API Error details:", error);
//     if (error.status === 404) {
//       console.error("Error 404: The model name might be incorrect or the API key doesn't have access to this model.");
//       console.error("Tried models: gemini-1.5-flash, gemini-pro, gemini-2.0-flash");
//     }
//     throw new Error("Failed to generate content from Gemini AI");
//   }
// };

// module.exports = { generateContent };


const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());

// model ek baar create karo (performance better)
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const generateContent = async (prompt) => {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;

    return response.text();
  } catch (error) {
    console.error("Gemini API Error:", error);

    // 🔹 Rate limit handling
    if (error.status === 429) {
      console.log("Rate limit hit. Retrying in 20 seconds...");
      await delay(20000);

      const result = await model.generateContent(prompt);
      const response = await result.response;

      return response.text();
    }

    // 🔹 Model not found
    if (error.status === 404) {
      console.error("Model not found. Check model name or API access.");
    }

    throw new Error("Failed to generate content from Gemini AI");
  }
};

const analyzeImage = async (prompt, imagePath, mimeType) => {
  try {
    const imageData = fs.readFileSync(imagePath);
    const imageBase64 = imageData.toString("base64");

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType
        }
      }
    ]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Vision API Error:", error);
    throw new Error("Failed to analyze image with Gemini AI");
  }
};

module.exports = { generateContent, analyzeImage };