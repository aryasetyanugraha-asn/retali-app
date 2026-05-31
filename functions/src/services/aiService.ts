import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { generateImageFromScratch, createLayout, fetchImageBuffer } from "./imageService";
import { watermarkVideo } from "./videoService";

/**
 * Downloads an image, resizes it, and overlays a branding logo.
 */
async function applyBranding(imageUrl: string): Promise<string> {
  try {
    const sharp = require("sharp");

    // 1. Download the background image
    const bgBuffer = await fetchImageBuffer(imageUrl);

    // 2. Download the logo
    const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/umrah-app-f044e.firebasestorage.app/o/media%2Flogos%2F1779085845396_Logo%20Retali.png?alt=media&token=cc8558b7-4060-40b4-b85f-b6a615b9f641';
    const logoBuffer = await fetchImageBuffer(logoUrl);

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
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
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
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
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
      4. For EACH option, also provide a "budget_plan" which contains:
         - "recommended_monthly_ad_spend": A realistic number in IDR for Indonesian market (e.g., 5000000).
         - "estimated_leads_min": The minimum expected leads.
         - "estimated_leads_max": The maximum expected leads.
         - "cpl_estimation": Cost Per Lead estimation in IDR.
         - "budget_allocation": An object breaking down the allocation by percentage, where the sum is 100 (e.g., { "Cold Traffic": 60, "Retargeting": 30, "Content Production": 10 }).

      Output EXACTLY in the following JSON structure without any markdown formatting, backticks, or extra text:
      {
        "option_a": {
          "theme": "Trust/Authority",
          "monthly_breakdown": [
            { "month_name": "Month 1", "monthly_theme": "Theme", "key_goal": "Goal" }
          ],
          "budget_plan": {
            "recommended_monthly_ad_spend": 5000000,
            "estimated_leads_min": 100,
            "estimated_leads_max": 250,
            "cpl_estimation": 25000,
            "budget_allocation": { "Cold Traffic": 60, "Retargeting": 30, "Content Production": 10 }
          }
        },
        "option_b": {
          "theme": "Emotional/Spiritual",
          "monthly_breakdown": [],
          "budget_plan": {
            "recommended_monthly_ad_spend": 5000000,
            "estimated_leads_min": 100,
            "estimated_leads_max": 250,
            "cpl_estimation": 25000,
            "budget_allocation": { "Cold Traffic": 60, "Retargeting": 30, "Content Production": 10 }
          }
        },
        "option_c": {
          "theme": "Hard-Selling",
          "monthly_breakdown": [],
          "budget_plan": {
            "recommended_monthly_ad_spend": 5000000,
            "estimated_leads_min": 100,
            "estimated_leads_max": 250,
            "cpl_estimation": 25000,
            "budget_allocation": { "Cold Traffic": 60, "Retargeting": 30, "Content Production": 10 }
          }
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
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
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
  timeoutSeconds: 120,
  memory: "2GiB"
}, async (request) => {
  // 1. Validate Authentication
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be logged in to generate content."
    );
  }

  // 2. Extract Data from Request
  const {
    topic,
    platform,
    tone = "professional",
    includeImage = false,
    generationMode = "AUTO", // AUTO, SCRATCH, LAYOUT, VIDEO_WATERMARK
    style = "MINIMALIST",
    bgUrl,
    videoUrl,
    logoUrl,
    componentUrls,
    brandText
  } = request.data;

  if (!topic || !platform) {
    throw new HttpsError(
      "invalid-argument",
      "Topic and Platform are required."
    );
  }

  try {
    // 3. Construct the Prompt specifically for Umrah Context
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
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
        if (generationMode === "SCRATCH") {
            const imagePrompt = `Create a highly detailed, premium marketing poster for an Umrah and Hajj travel agency. Topic: ${topic}. Style: ${style}, elegant, high-end, incorporating subtle modern futuristic aesthetics, sleek 3D elements, glassmorphism accents, cinematic lighting, 8k resolution, hyper-realistic, photorealistic, visually stunning Islamic design. Ensure there is clean, negative space for text overlay.`;
            const rawBase64 = await generateImageFromScratch(imagePrompt);

            imageBase64 = await createLayout(rawBase64, {
                style,
                topic,
                brandText: brandText || topic,
                logoUrl,
                componentUrls
            });
        } else if (generationMode === "LAYOUT" && bgUrl) {
            imageBase64 = await createLayout(bgUrl, {
                style,
                topic,
                brandText: brandText || topic,
                logoUrl,
                componentUrls
            });
        } else if (generationMode === "VIDEO_WATERMARK" && videoUrl && logoUrl) {
            // Process video and return URL instead of base64
            const processedUrl = await watermarkVideo(videoUrl, logoUrl);
            return {
                success: true,
                data: text,
                videoUrl: processedUrl,
                timestamp: new Date().toISOString()
            };
        } else {
            // Default/Fallback behavior
            const randomImageUrl = bgUrl || `https://loremflickr.com/1080/1350/mecca,umrah,mosque?random=${Math.random()}`;
            imageBase64 = await applyBranding(randomImageUrl);
        }
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
