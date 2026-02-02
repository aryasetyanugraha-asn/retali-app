import { onCall, HttpsError } from "firebase-functions/v2/https";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as logger from "firebase-functions/logger";

// Initialize Gemini
// Note: Ensure GEMINI_API_KEY is set in Firebase secrets or environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const generateAIContent = onCall({ cors: true, region: "asia-southeast2" }, async (request) => {
  // 1. Validate Authentication
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be logged in to generate content."
    );
  }

  // 2. Extract Data from Request
  const { topic, platform, tone = "professional" } = request.data;

  if (!topic || !platform) {
    throw new HttpsError(
      "invalid-argument",
      "Topic and Platform are required."
    );
  }

  try {
    // 3. Construct the Prompt specifically for Umrah Context
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
      Act as an expert Social Media Specialist for an Umrah & Hajj Travel Agency in Indonesia.

      Create a post for: ${platform}
      Topic: ${topic}
      Tone: ${tone}

      Requirements:
      - Language: Bahasa Indonesia (Persuasive and Islamic).
      - Include 5-10 relevant hashtags (e.g., #Umrah, #Haji, #TravelSunnah).
      - For Instagram/Facebook: Structure it with a catchy Hook, Value Proposition, and Call to Action (CTA).
      - For TikTok: Create a short script or caption.
      - Do NOT include markdown formatting like **bold** or *italic*, just plain text with emojis.
    `;

    // 4. Call AI
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    logger.info(`Content generated for user ${request.auth.uid}`, { topic, platform });

    return {
      success: true,
      data: text,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error("Error generating content:", error);
    throw new HttpsError("internal", "Failed to generate content via AI.");
  }
});
