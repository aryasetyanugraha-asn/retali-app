import { onCall, HttpsError } from "firebase-functions/v2/https";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as logger from "firebase-functions/logger";
import axios from "axios";
import sharp from "sharp";

// Initialize Gemini
// Note: Ensure GEMINI_API_KEY is set in Firebase secrets or environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Downloads an image, resizes it, and overlays a branding logo.
 */
async function applyBranding(imageUrl: string): Promise<string> {
  try {
    // 1. Download the background image
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const bgBuffer = Buffer.from(imageResponse.data);

    // 2. Download the logo
    const logoUrl = 'https://retali.id/wp-content/uploads/2024/09/Logo-HO-color-1.png';
    const logoResponse = await axios.get(logoUrl, { responseType: 'arraybuffer' });
    const logoBuffer = Buffer.from(logoResponse.data);

    // 3. Process with Sharp
    const width = 1080;
    const height = 1350;
    const padding = 50;
    const logoTargetWidth = 250;

    // Resize background to 1080x1350 (Instagram Portrait)
    const background = sharp(bgBuffer)
      .resize(width, height, {
        fit: 'cover',
        position: 'center'
      });

    // Resize logo
    const logoResized = await sharp(logoBuffer)
      .resize({ width: logoTargetWidth })
      .toBuffer();

    // Get logo dimensions
    const logoMeta = await sharp(logoResized).metadata();
    const logoHeight = logoMeta.height || 100;

    // Calculate position (Bottom Right)
    const top = height - logoHeight - padding;
    const left = width - logoTargetWidth - padding;

    // Composite logo onto background
    const finalBuffer = await background
      .composite([{
        input: logoResized,
        top: Math.round(top),
        left: Math.round(left)
      }])
      .toFormat('jpeg')
      .toBuffer();

    // Return as Base64 string
    return `data:image/jpeg;base64,${finalBuffer.toString('base64')}`;
  } catch (error) {
    logger.error("Error in applyBranding:", error);
    throw error;
  }
}

export const generateAIContent = onCall({
  cors: true,
  region: "asia-southeast2",
  timeoutSeconds: 60,
  memory: "1GiB"
}, async (request) => {
  // 1. Validate Authentication
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be logged in to generate content."
    );
  }

  // 2. Extract Data from Request
  const { topic, platform, tone = "professional", includeImage = false } = request.data;

  if (!topic || !platform) {
    throw new HttpsError(
      "invalid-argument",
      "Topic and Platform are required."
    );
  }

  try {
    // 3. Construct the Prompt specifically for Umrah Context
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

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

    // 4. Call AI & Image Generation
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let imageBase64: string | undefined;

    if (includeImage) {
      try {
        // Fetch a random Unsplash image related to "Umrah/Mecca"
        // Using loremflickr as a reliable placeholder since source.unsplash.com is deprecated
        const randomImageUrl = "https://loremflickr.com/1080/1350/mecca,umrah,mosque";
        imageBase64 = await applyBranding(randomImageUrl);
      } catch (imgError) {
        logger.error("Failed to generate branded image:", imgError);
        // Continue without image if it fails
      }
    }

    logger.info(`Content generated for user ${request.auth.uid}`, { topic, platform, hasImage: !!imageBase64 });

    return {
      success: true,
      data: text,
      image: imageBase64,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error("Error generating content:", error);
    throw new HttpsError("internal", "Failed to generate content via AI.");
  }
});
