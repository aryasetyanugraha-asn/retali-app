import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import axios from "axios";
import { GoogleGenAI } from '@google/genai';

/**
 * Generates a video from an image buffer using Google's Veo 3.1.
 * Uploads image to GS, calls GenAI, polls for video, downloads to /tmp, returns local path.
 */
export async function generateVideoFromImage(imageBuffer: Buffer): Promise<string> {
  const uuid = Date.now().toString() + Math.random().toString(36).substring(7);

  // Step A: Save image locally to /tmp and upload via GenAI File API
  const localImagePath = path.join(os.tmpdir(), `input_${uuid}.jpg`);
  await fs.promises.writeFile(localImagePath, imageBuffer);
  logger.info(`Saved input image locally: ${localImagePath}`);

  let uploadResult: any = null;
  let localVideoPath = "";

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    logger.info("Uploading image via GenAI File API...");
    uploadResult = await ai.files.upload({
      file: localImagePath,
      config: { mimeType: "image/jpeg" }
    });
    logger.info(`Uploaded image successfully, file URI: ${uploadResult.uri}`);

    // Step B: Use GoogleGenAI to generate video
    const prompt = "Cinematic slow motion pan. The scene comes alive with subtle, elegant movement. High-end commercial style, photorealistic, 4k resolution, smooth and peaceful atmosphere. no sound";

    logger.info("Calling Veo 3.1 model...");
    let operation: any = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: uploadResult,
      config: {
        numberOfVideos: 1,
        aspectRatio: '9:16',
        personGeneration: "DONT_ALLOW",
        resolution: '720p',
        durationSeconds: 8
      } as any
    });

    logger.info(`Video generation operation started: ${operation.name}`);

    // Step C: Poll the operation until done
    while (!operation.done) {
      logger.info(`Polling operation ${operation.name}... sleeping 10s`);
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.get({ operation });
    }

    if (operation.error) {
      throw new Error(`Operation failed: ${JSON.stringify(operation.error)}`);
    }

    const generatedVideos = (operation.response as any)?.generatedVideos;
    if (!generatedVideos || generatedVideos.length === 0) {
       throw new Error("No video generated.");
    }

    const videoObj = generatedVideos[0].video;

    localVideoPath = path.join(os.tmpdir(), `temp_veo_video_${uuid}.mp4`);

    if (videoObj.uri) {
      logger.info(`Generated video URI: ${videoObj.uri}`);
      if (videoObj.uri.startsWith("gs://")) {
         const [, , bucketName, ...keyParts] = videoObj.uri.split('/');
         const fileKey = keyParts.join('/');
         await admin.storage().bucket(bucketName).file(fileKey).download({ destination: localVideoPath });
      } else {
         const res = await axios.get(videoObj.uri, { responseType: 'stream' });
         await new Promise((resolve, reject) => {
             res.data.pipe(fs.createWriteStream(localVideoPath))
                .on('finish', resolve)
                .on('error', reject);
         });
      }
    } else if (videoObj.bytes) {
      logger.info("Generated video available as bytes.");
      fs.writeFileSync(localVideoPath, Buffer.from(videoObj.bytes, 'base64'));
    } else if (videoObj.videoBytes) {
      logger.info("Generated video available as videoBytes.");
      fs.writeFileSync(localVideoPath, Buffer.from(videoObj.videoBytes, 'base64'));
    } else {
      throw new Error("Generated video has no URI and no bytes.");
    }

    logger.info(`Video downloaded successfully to ${localVideoPath}`);

  } finally {
    // Step D: Cleanup local input file and remote uploaded file
    try {
      if (fs.existsSync(localImagePath)) {
        await fs.promises.unlink(localImagePath);
        logger.info(`Deleted local input image: ${localImagePath}`);
      }
    } catch (e) {
      logger.error(`Failed to delete local image ${localImagePath}`, e);
    }

    if (uploadResult && uploadResult.name) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        await ai.files.delete({ name: uploadResult.name });
        logger.info(`Deleted remote uploaded file: ${uploadResult.name}`);
      } catch (e) {
        logger.error(`Failed to delete remote file ${uploadResult.name}`, e);
      }
    }
  }

  return localVideoPath;
}

/**
 * Adds watermarks to a local video using FFmpeg.
 * Takes a localVideoPath (or a URL if preserving old signature temporarily, but we'll adapt).
 * Uploads the final video to Firebase Storage and returns the public URL.
 */
export async function watermarkVideo(localVideoPathOrUrl: string, logoUrlDummy?: string): Promise<string> {
  const ffmpeg = require("fluent-ffmpeg");
  const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");

  ffmpeg.setFfmpegPath(ffmpegInstaller.path);

  const uuid = Date.now().toString();
  const tempLogo1Path = path.join(os.tmpdir(), `logo1_${uuid}.png`);
  const tempLogo2Path = path.join(os.tmpdir(), `logo2_${uuid}.png`);
  const tempOutputPath = path.join(os.tmpdir(), `output_${uuid}.mp4`);

  let tempVideoPath = localVideoPathOrUrl;
  let isVideoUrl = localVideoPathOrUrl.startsWith("http");
  if (isVideoUrl) {
    tempVideoPath = path.join(os.tmpdir(), `input_${uuid}.mp4`);
  }

  const logo1Url = "https://firebasestorage.googleapis.com/v0/b/umrah-app-f044e.firebasestorage.app/o/media%2Flogos%2F1779085845396_Logo%20Retali.png?alt=media&token=cc8558b7-4060-40b4-b85f-b6a615b9f641";
  const logo2Url = "https://firebasestorage.googleapis.com/v0/b/umrah-app-f044e.firebasestorage.app/o/media%2Flogos%2F1779086027689_LOGO%20BUPI%20NEW%20Trans.png?alt=media&token=4f0c98ac-5817-4ef6-9047-ae3791bb7cb9";

  try {
    // 1. Download Video (if URL) and Logos
    const downloads: Promise<any>[] = [
      axios.get(logo1Url, { responseType: 'stream' }).then(res =>
        new Promise((resolve, reject) => res.data.pipe(fs.createWriteStream(tempLogo1Path)).on('finish', resolve).on('error', reject))
      ),
      axios.get(logo2Url, { responseType: 'stream' }).then(res =>
        new Promise((resolve, reject) => res.data.pipe(fs.createWriteStream(tempLogo2Path)).on('finish', resolve).on('error', reject))
      )
    ];

    if (isVideoUrl) {
      downloads.push(
        axios.get(localVideoPathOrUrl, { responseType: 'stream' }).then(res =>
          new Promise((resolve, reject) => res.data.pipe(fs.createWriteStream(tempVideoPath)).on('finish', resolve).on('error', reject))
        )
      );
    }

    await Promise.all(downloads);

    // 2. Process with FFmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(tempVideoPath)
        .input(tempLogo1Path)
        .input(tempLogo2Path)
        .complexFilter([
          // Scale Logo 1 to width 120px
          "[1:v]scale=120:-1[logo1]",
          // Scale Logo 2 to width 120px
          "[2:v]scale=120:-1[logo2]",
          // Overlay Logo 1 top-left (x=40, y=50)
          "[0:v][logo1]overlay=40:50[v1]",
          // Overlay Logo 2 top-right (x=W-w-40, y=50)
          "[v1][logo2]overlay=main_w-overlay_w-40:50[v2]",
          // Drawtext at bottom-center
          {
            filter: 'drawtext',
            options: {
              text: 'www.retali.id',
              fontcolor: 'white',
              fontsize: 28,
              box: 1,
              boxcolor: 'black@0.4',
              boxborderw: 5,
              x: '(w-text_w)/2',
              y: 'h-th-40' // 40px from bottom
            },
            inputs: '[v2]',
            outputs: '[out]'
          }
        ], '[out]')
        .outputOptions([
          "-pix_fmt yuv420p",
          "-c:v libx264",
          "-preset fast"
        ])
        .on('end', resolve)
        .on('error', (err: any) => {
          logger.error("FFmpeg error:", err);
          reject(err);
        })
        .save(tempOutputPath);
    });

    // 3. Upload to Firebase Storage
    const bucket = admin.storage().bucket();
    const destination = `media/generated_videos/${uuid}.mp4`;
    await bucket.upload(tempOutputPath, {
      destination,
      metadata: { contentType: 'video/mp4' }
    });

    const file = bucket.file(destination);
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;

    return publicUrl;
  } catch (error) {
    logger.error("Error watermarking video:", error);
    throw error;
  } finally {
    // Cleanup
    const toDelete = [tempLogo1Path, tempLogo2Path, tempOutputPath];
    if (isVideoUrl) {
      toDelete.push(tempVideoPath);
    } else {
      // also cleanup the local video generated by Veo
      toDelete.push(localVideoPathOrUrl);
    }

    toDelete.forEach(p => {
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch(e) {}
      }
    });
  }
}
