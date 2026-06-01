import * as admin from "firebase-admin";
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
    apiEndpoint: "us-central1-aiplatform.googleapis.com",
  };
  const predictionServiceClient = new PredictionServiceClient(clientOptions);

  const project = getProjectId();
  const location = "us-central1";
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
    logger.debug("Raw Prediction Value:", JSON.stringify(predictionValue));

    // Safely extract bytesBase64
    let bytesBase64: string | undefined;

    // Menambahkan pengecekan untuk 'bytesBase64Encoded' sesuai struktur Imagen 3 terbaru
    if (predictionValue.structValue?.fields?.bytesBase64Encoded?.stringValue) {
      bytesBase64 = predictionValue.structValue.fields.bytesBase64Encoded.stringValue;
    } else if (predictionValue.structValue?.fields?.bytesBase64?.stringValue) {
      bytesBase64 = predictionValue.structValue.fields.bytesBase64.stringValue;
    } else if (predictionValue.bytesBase64Encoded) {
      bytesBase64 = predictionValue.bytesBase64Encoded;
    } else if (predictionValue.bytesBase64) {
      bytesBase64 = predictionValue.bytesBase64;
    } else if (typeof predictionValue === 'string') {
      // Sometimes the prediction itself is just the base64 string
      bytesBase64 = predictionValue;
    } else if (predictionValue.structValue?.fields?.bytesBase64Encoded) {
      bytesBase64 = typeof predictionValue.structValue.fields.bytesBase64Encoded === 'string'
        ? predictionValue.structValue.fields.bytesBase64Encoded
        : undefined;
    }

    if (!bytesBase64) {
      logger.error("Could not extract bytesBase64 from prediction. Prediction structure:", JSON.stringify(predictionValue));
      throw new Error("Failed to parse image data from Imagen response");
    }

    return `data:image/jpeg;base64,${bytesBase64}`;
  } catch (error) {
    logger.error("Error generating image from Imagen:", error);
    throw error;
  }
}

export async function fetchImageBuffer(url: string): Promise<Buffer> {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname === 'firebasestorage.googleapis.com') {
      // Extract bucket and file path from URL
      // Typical URL: https://firebasestorage.googleapis.com/v0/b/bucket-name.appspot.com/o/path%2Fto%2Ffile.jpg?alt=media&token=...
      const match = parsedUrl.pathname.match(/\/v0\/b\/([^\/]+)\/o\/(.+)/);
      if (match) {
        const bucketName = match[1];
        const filePath = decodeURIComponent(match[2]);

        const [buffer] = await admin.storage().bucket(bucketName).file(filePath).download();
        return buffer;
      }
    }
  } catch (error) {
    logger.warn(`Failed to parse URL or download from storage: ${url}`, error);
    // Fallback to axios if parsing or storage download fails
  }

  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

/**
 * Composites multiple assets into a final premium poster layout
 * with Smart Placement & Custom Typography.
 */
export async function createLayout(bgInput: string | Buffer, options: LayoutOptions): Promise<string> {
  try {
    const sharp = require("sharp");
    const width = 1080;
    const height = 1350; // Format Portrait Instagram

    // 1. Siapkan Background Image Buffer
    let bgBuffer: Buffer;
    if (Buffer.isBuffer(bgInput)) {
      bgBuffer = bgInput;
    } else if (bgInput.startsWith("http")) {
      // Input is a URL
      bgBuffer = await fetchImageBuffer(bgInput);
    } else {
      // Input is a base64 string (either with or without data uri prefix)
      const base64Data = bgInput.replace(/^data:image\/\w+;base64,/, "");
      bgBuffer = Buffer.from(base64Data, 'base64');
    }
    let compositeArray: any[] = [];

    // 2. Setup Font & Teks Bawaan
    const title = options.brandText ? options.brandText.toUpperCase() : "";
    const website = "www.retali.id";

    // 3. Membangun Template SVG Premium (Minimalis, Tidak Terlalu Ramai)
    const svgOverlay = `
    <svg width="${width}" height="${height}">
      <defs>
        <!-- Efek gradasi gelap halus dari bawah untuk menonjolkan teks dan komponen -->
        <linearGradient id="glassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(0, 0, 0, 0.0);" />
          <stop offset="40%" style="stop-color:rgba(0, 0, 0, 0.0);" />
          <stop offset="100%" style="stop-color:rgba(0, 0, 0, 0.7);" />
        </linearGradient>
      </defs>

      <style>
        /* Inject Font Montserrat dan Roboto - Ukuran lebih proporsional */
        .title { fill: #FFFFFF; font-size: 52px; font-weight: 800; font-family: 'Montserrat', sans-serif; letter-spacing: 1px; }
        .website { fill: #E2E8F0; font-size: 20px; font-weight: 500; font-family: 'Roboto', sans-serif; letter-spacing: 1.5px; opacity: 0.9; }
      </style>

      <!-- Panel Bayangan Bawah -->
      <rect x="0" y="0" width="${width}" height="${height}" fill="url(#glassGradient)" />

      <!-- Penempatan Teks (Lebih minimalis) -->
      ${title ? `<text x="50%" y="${height - 220}" text-anchor="middle" class="title">${title}</text>` : ''}
      <text x="50%" y="${height - 180}" text-anchor="middle" class="website">🌍 ${website}</text>
    </svg>`;

    compositeArray.push({
      input: Buffer.from(svgOverlay),
      top: 0,
      left: 0
    });

    // 4. Posisi Logo Retali (Pojok Kanan Atas)
    if (options.logoUrl) {
      try {
        const logoBuffer = await fetchImageBuffer(options.logoUrl);
        const logoResized = await sharp(logoBuffer)
          .resize({ width: 220, withoutEnlargement: true })
          .toBuffer();

        compositeArray.push({
          input: logoResized,
          top: 60,
          left: width - 220 - 60, // Kanan Atas
        });
      } catch (e) {
        logger.error("Gagal memuat logo:", e);
      }
    }

    // 5. Smart Placement Komponen Spesifik (Algoritma Baru yang Dinamis dan Tidak Menumpuk)
    if (options.componentUrls && options.componentUrls.length > 0) {
      for (let i = 0; i < options.componentUrls.length; i++) {
        const url = options.componentUrls[i];
        try {
          const compBuffer = await fetchImageBuffer(url);
          const urlLower = url.toLowerCase();

          if (urlLower.includes('lembaga')) {
            // Lembaga -> Pojok Kiri Atas (Jangan terlalu kecil)
            const compResized = await sharp(compBuffer).resize({ width: 450 }).toBuffer();
            compositeArray.push({ input: compResized, top: 60, left: 60 });
          } else if (urlLower.includes('tagline')) {
            // Tagline -> Tengah Atas (Di bawah margin atas)
            const compResized = await sharp(compBuffer).resize({ width: 600 }).toBuffer();
            compositeArray.push({ input: compResized, top: 220, left: Math.round((width - 600) / 2) });
          } else if (urlLower.includes('seat') || urlLower.includes('sisa')) {
            // Badge Seat Terbatas -> Tengah Kanan (Agar tidak tabrakan dengan logo di atas)
            const compResized = await sharp(compBuffer).resize({ width: 250 }).toBuffer();
            compositeArray.push({ input: compResized, top: 380, left: width - 250 - 60 });
          } else if (urlLower.includes('ustadz')) {
            // Ustadz -> Bawah Tengah (Cukup besar agar terbaca)
            const compResized = await sharp(compBuffer).resize({ width: 850 }).toBuffer();
            const meta = await sharp(compResized).metadata();
            const compHeight = meta.height || 300;
            // Tempatkan di atas area footer teks
            compositeArray.push({ input: compResized, top: height - compHeight - 250, left: Math.round((width - 850) / 2) });
          } else if (urlLower.includes('info') || urlLower.includes('footer')) {
            // Barisan Info Harga/Jadwal -> Footer paling bawah
            const compResized = await sharp(compBuffer).resize({ width: width }).toBuffer();
            const meta = await sharp(compResized).metadata();
            const compHeight = meta.height || 120;
            compositeArray.push({ input: compResized, top: height - compHeight, left: 0 });
          } else {
            // Fallback (Grid Placement di kiri tengah)
            const compResized = await sharp(compBuffer).resize({ width: 200 }).toBuffer();
            const verticalOffset = 300 + (i * 220); // Susun ke bawah
            compositeArray.push({ input: compResized, top: Math.min(verticalOffset, height - 300), left: 60 });
          }
        } catch (e) {
          logger.error(`Gagal memuat komponen ${url}:`, e);
        }
      }
    }

    // 6. Rendering Final
    const finalBuffer = await sharp(bgBuffer)
      .resize(width, height, { fit: 'cover', position: 'center' })
      .composite(compositeArray)
      .toFormat('jpeg', { quality: 95 })
      .toBuffer();

    return `data:image/jpeg;base64,${finalBuffer.toString('base64')}`;
  } catch (error) {
    logger.error("Error creating layout:", error);
    throw error;
  }
}
