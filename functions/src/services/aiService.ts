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
    // Force 'cover' to ensure image fills the canvas and removes borders
    const background = sharp(bgBuffer)
      .resize({
        width: width,
        height: height,
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

export const generateAiReply = onCall({
  cors: true,
  region: "asia-southeast2",
  timeoutSeconds: 60,
  memory: "512MiB"
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be logged in to generate a reply."
    );
  }

  const { chatHistory } = request.data;

  if (!chatHistory || !Array.isArray(chatHistory)) {
    throw new HttpsError(
      "invalid-argument",
      "chatHistory array is required."
    );
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const systemPrompt = "Anda adalah seorang Customer Service Senior di sebuah Travel Umrah dan Haji yang profesional. Tugas Anda adalah membalas pesan calon jamaah. Baca riwayat chat ini dan buatkan SATU draf balasan yang sopan, empatik, persuasif, dan mengarahkan jamaah untuk segera melakukan DP (Down Payment) atau konsultasi lebih lanjut. Jangan gunakan bahasa yang kaku seperti robot. Gunakan emoji secukupnya.";

    const historyText = chatHistory.map((msg: any) => `${msg.sender}: ${msg.text}`).join("\n");
    const prompt = `${systemPrompt}\n\nRiwayat Chat:\n${historyText}\n\nBalasan:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return {
      success: true,
      data: text,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error("Error generating AI reply:", error);
    throw new HttpsError("internal", "Failed to generate AI reply.");
  }
});

export const generateCampaignOptions = onCall({
  cors: true,
  region: "asia-southeast2",
  timeoutSeconds: 120,
  memory: "1GiB"
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in to generate campaigns.");
  }

  const { title, target_audience, start_date } = request.data;
  if (!title || !target_audience || !start_date) {
    throw new HttpsError("invalid-argument", "Missing required fields: title, target_audience, start_date.");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const prompt = `
      Act as a Digital Marketing Director for an Umrah & Hajj Travel Agency in Indonesia.
      You are tasked with generating a 6-month marketing roadmap.

      Inputs:
      - Campaign Title: ${title}
      - Target Audience: ${target_audience}
      - Start Date: ${start_date}

      Requirements:
      1. Map the next 6 months (starting from the Start Date) to the Hijri Calendar and note any important Islamic events (e.g., Ramadhan, Dzulhijjah, Maulid Nabi).
      2. Provide 3 distinct strategy options:
         - Option A: Trust/Authority (Edukasi, Testimoni, Fiqih Umrah)
         - Option B: Emotional/Spiritual (Rindu Baitullah, Keutamaan Ibadah, Kisah Inspiratif)
         - Option C: Hard-Selling (Promo, Diskon, Seat Terbatas, Flash Sale)
      3. For EACH option, provide a "theme" and a "monthly_breakdown" containing 6 elements (one for each month). Each month should have a "month_name" (Gregorian & Hijri context), "monthly_theme", and "key_goal".

      Output EXACTLY in the following JSON structure without any markdown formatting, backticks, or extra text:
      {
        "option_a": {
          "theme": "Trust/Authority",
          "monthly_breakdown": [
            { "month_name": "Month 1", "monthly_theme": "Theme", "key_goal": "Goal" }
          ]
        },
        "option_b": {
          "theme": "Emotional/Spiritual",
          "monthly_breakdown": []
        },
        "option_c": {
          "theme": "Hard-Selling",
          "monthly_breakdown": []
        }
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    text = text.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();

    return {
      success: true,
      data: JSON.parse(text),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error("Error generating campaign options:", error);
    throw new HttpsError("internal", "Failed to generate campaign options.");
  }
});

export const generateMonthBreakdown = onCall({
  cors: true,
  region: "asia-southeast2",
  timeoutSeconds: 120,
  memory: "1GiB"
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const { campaign_title, option_theme, month_name, monthly_theme, key_goal } = request.data;
  if (!campaign_title || !option_theme || !month_name) {
    throw new HttpsError("invalid-argument", "Missing required fields.");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const prompt = `
      Act as a Social Media Specialist for an Umrah & Hajj Travel Agency.
      I need 12 specific post ideas for a particular month based on the following strategy:

      Campaign: ${campaign_title}
      Strategy Theme: ${option_theme}
      Month: ${month_name}
      Monthly Theme: ${monthly_theme}
      Key Goal: ${key_goal}

      Requirements:
      Generate exactly 12 posts. Spread them roughly as Mon-Wed-Fri for 4 weeks.
      For each post, provide:
      1. A short, persuasive caption in Bahasa Indonesia (with emojis and hashtags).
      2. A brief prompt/description for the visual image.

      Output EXACTLY in the following JSON structure without any markdown formatting, backticks, or extra text:
      [
        {
          "caption": "Post caption here...",
          "image_prompt": "Visual description here..."
        }
      ]
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    text = text.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();

    return {
      success: true,
      data: JSON.parse(text),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error("Error generating month breakdown:", error);
    throw new HttpsError("internal", "Failed to generate month breakdown.");
  }
});

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
        // Using loremflickr as a reliable placeholder since source.unsplash.com is deprecated, but adding randomization as requested
        const randomImageUrl = `https://loremflickr.com/1080/1350/mecca,umrah,mosque?random=${Math.random()}`;
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
