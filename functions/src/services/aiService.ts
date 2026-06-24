import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { generateImageFromScratch, createLayout } from "./imageService";
import { generateVideoFromImage, watermarkVideo } from "./videoService";

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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
  timeoutSeconds: 540,
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
    animateWithAI = false,
    generationMode = "SCRATCH", // SCRATCH, LAYOUT, VIDEO_WATERMARK
    style = "MINIMALIST",
    bgUrl,
    videoUrl,
    logoUrl,
    componentUrls,
    brandText,
    customImagePrompt
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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    let expandedPrompt: string | undefined;

    if (includeImage) {
      try {
        if (generationMode === "SCRATCH") {
            // Prompt Expansion for Imagen 3.0
            const expansionSystemPrompt = `
              Act as a Creative Director for a premium Islamic Travel Agency.
              Your goal is to expand a short topic or prompt into a highly detailed, visually stunning descriptive prompt for an AI image generator (Imagen 3.0).

              CRITICAL RULES:
              1. DO NOT include any text, letters, or words in the description. The image must be purely visual.
              2. Focus on cinematic lighting, 8k resolution, photorealistic textures, and elegant Islamic architecture or atmosphere.
              3. Ensure the description includes "clean negative space" (empty areas) on the top or bottom for text overlays.
              4. Use descriptive words like: 'ethereal', 'majestic', 'tranquil', 'luxurious', 'high-contrast'.
              5. Output ONLY the expanded description in English.
            `;

            const userPromptForExpansion = customImagePrompt || `An elegant and premium scene about ${topic} for an Umrah and Hajj travel agency.`;
            const expansionResult = await model.generateContent(`${expansionSystemPrompt}\n\nUser Input: ${userPromptForExpansion}`);
            expandedPrompt = expansionResult.response.text().trim();

            logger.info("Expanded Prompt:", expandedPrompt);

            const rawBase64 = await generateImageFromScratch(expandedPrompt);

            if (animateWithAI) {
                // Generate Video from Image Buffer
                const cleanBase64 = rawBase64.replace(/^data:image\/\w+;base64,/, "");
                const imageBuffer = Buffer.from(cleanBase64, 'base64');
                const veoLocalVideoPath = await generateVideoFromImage(imageBuffer);
                const finalUrl = await watermarkVideo(veoLocalVideoPath);
                return {
                    success: true,
                    data: text,
                    videoUrl: finalUrl,
                    timestamp: new Date().toISOString()
                };
            }

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
        } else if (generationMode === "VIDEO_WATERMARK" && videoUrl) {
            const processedUrl = await watermarkVideo(videoUrl);
            return {
              success: true,
              data: text,
              videoUrl: processedUrl,
              timestamp: new Date().toISOString()
            };
        }
      } catch (error) {
        logger.error("Error generating/processing media:", error);
      }
    }

    logger.info("Content generated successfully");
    return {
      success: true,
      data: text,
      image: imageBase64 ? imageBase64 : null,
      expandedPrompt: expandedPrompt || null,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error("Error generating content:", error);
    throw new HttpsError("internal", "Failed to generate content via AI.");
  }
});
