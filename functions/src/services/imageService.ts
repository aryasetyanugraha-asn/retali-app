import * as logger from "firebase-functions/logger";
import axios from "axios";

interface LayoutOptions {
  style: 'MINIMALIST' | 'BUSY';
  topic: string;
  brandText?: string;
  logoUrl?: string;
  componentUrls?: string[];
}

function getProjectId() {
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  if (process.env.FIREBASE_CONFIG) {
    try {
      return JSON.parse(process.env.FIREBASE_CONFIG).projectId;
    } catch (e) {
      return "";
    }
  }
  return "";
}

/**
 * Generates an image from scratch using Imagen on Vertex AI.
 */
export async function generateImageFromScratch(prompt: string): Promise<string> {
  const { PredictionServiceClient, helpers } = require("@google-cloud/aiplatform");
  const clientOptions = {
    apiEndpoint: "asia-southeast1-aiplatform.googleapis.com",
  };
  const predictionServiceClient = new PredictionServiceClient(clientOptions);

  const project = getProjectId();
  const location = "asia-southeast1";
  const publisher = "google";
  const model = "imagen-3.0-generate-001";

  if (!project) {
    logger.error("Project ID not found for Imagen generation");
    throw new Error("Internal Configuration Error");
  }

  const endpoint = `projects/${project}/locations/${location}/publishers/${publisher}/models/${model}`;

  const instance = {
    prompt: prompt,
  };
  const instanceValue = helpers.toValue(instance);
  const instances = [instanceValue!];

  const parameter = {
    sampleCount: 1,
    aspectRatio: "3:4", // Portrait for Instagram
    outputMimeType: "image/jpeg",
  };
  const parameters = helpers.toValue(parameter);

  try {
    const [response] = await predictionServiceClient.predict({
      endpoint,
      instances,
      parameters,
    });

    const predictions = response.predictions;
    if (!predictions || predictions.length === 0) {
      throw new Error("No predictions returned from Imagen");
    }

    const predictionValue: any = predictions[0];
    const bytesBase64 = predictionValue.structValue.fields.bytesBase64.stringValue;
    return `data:image/jpeg;base64,${bytesBase64}`;
  } catch (error) {
    logger.error("Error generating image from Imagen:", error);
    throw error;
  }
}

/**
 * Composites multiple assets into a final poster layout.
 */
export async function createLayout(bgUrl: string, options: LayoutOptions): Promise<string> {
  try {
    const sharp = require("sharp");
    const width = 1080;
    const height = 1350;

    // 1. Load Background
    const bgResponse = await axios.get(bgUrl, { responseType: 'arraybuffer' });
    const bgBuffer = Buffer.from(bgResponse.data);

    let compositeArray: any[] = [];

    // 2. Add Logo (Top Left)
    if (options.logoUrl) {
      const logoResponse = await axios.get(options.logoUrl, { responseType: 'arraybuffer' });
      const logoResized = await sharp(Buffer.from(logoResponse.data))
        .resize({ width: 220 })
        .toBuffer();

      compositeArray.push({
        input: logoResized,
        top: 60,
        left: 60,
      });
    }

    // 3. Add Components (Ornaments)
    if (options.componentUrls && options.componentUrls.length > 0) {
      // Position components in corners or edges
      const positions = [
        { top: 0, left: width - 300 }, // Top Right
        { top: height - 300, left: 0 }, // Bottom Left
      ];

      for (let i = 0; i < Math.min(options.componentUrls.length, positions.length); i++) {
        const compResponse = await axios.get(options.componentUrls[i], { responseType: 'arraybuffer' });
        const compResized = await sharp(Buffer.from(compResponse.data))
          .resize({ width: 300 })
          .toBuffer();

        compositeArray.push({
          input: compResized,
          ...positions[i]
        });
      }
    }

    // 4. Add Text Overlay with Brand Colors (Purple & Red)
    if (options.brandText) {
        const title = options.brandText.toUpperCase();
        const svgText = `
        <svg width="${width}" height="${height}">
          <defs>
            <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#800080;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#FF0000;stop-opacity:1" />
            </linearGradient>
          </defs>
          <style>
            .title { fill: white; font-size: 72px; font-weight: 800; font-family: 'Montserrat', sans-serif; }
            .bg-rect { fill: url(#brandGradient); fill-opacity: 0.85; }
            .accent { fill: #FF0000; }
          </style>

          ${options.style === 'BUSY' ? `
            <rect x="0" y="${height - 280}" width="${width}" height="280" class="bg-rect" />
            <rect x="0" y="${height - 290}" width="${width}" height="10" fill="#FF0000" />
          ` : `
            <rect x="100" y="${height - 200}" width="${width - 200}" height="120" rx="10" class="bg-rect" />
          `}

          <text x="50%" y="${height - 120}" text-anchor="middle" class="title">${title}</text>
        </svg>`;

        compositeArray.push({
            input: Buffer.from(svgText),
            top: 0,
            left: 0
        });
    }

    const finalBuffer = await sharp(bgBuffer)
      .resize(width, height, { fit: 'cover' })
      .composite(compositeArray)
      .toFormat('jpeg', { quality: 90 })
      .toBuffer();

    return `data:image/jpeg;base64,${finalBuffer.toString('base64')}`;
  } catch (error) {
    logger.error("Error creating layout:", error);
    throw error;
  }
}
