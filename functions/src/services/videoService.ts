import * as logger from "firebase-functions/logger";
import ffmpeg from "fluent-ffmpeg";
import * as admin from "firebase-admin";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import axios from "axios";

/**
 * Adds a logo watermark to a video.
 */
export async function watermarkVideo(videoUrl: string, logoUrl: string): Promise<string> {
  const tempVideoPath = path.join(os.tmpdir(), `input_${Date.now()}.mp4`);
  const tempLogoPath = path.join(os.tmpdir(), `logo_${Date.now()}.png`);
  const tempOutputPath = path.join(os.tmpdir(), `output_${Date.now()}.mp4`);

  try {
    // 1. Download Video and Logo
    const videoResponse = await axios.get(videoUrl, { responseType: 'stream' });
    const logoResponse = await axios.get(logoUrl, { responseType: 'stream' });

    await Promise.all([
      new Promise((resolve, reject) => videoResponse.data.pipe(fs.createWriteStream(tempVideoPath)).on('finish', resolve).on('error', reject)),
      new Promise((resolve, reject) => logoResponse.data.pipe(fs.createWriteStream(tempLogoPath)).on('finish', resolve).on('error', reject))
    ]);

    // 2. Process with FFmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(tempVideoPath)
        .input(tempLogoPath)
        .complexFilter([
          "[1:v]scale=150:-1[logo]",
          "[0:v][logo]overlay=main_w-overlay_w-40:40"
        ])
        .outputOptions("-pix_fmt yuv420p")
        .on('end', resolve)
        .on('error', (err) => {
          logger.error("FFmpeg error:", err);
          reject(err);
        })
        .save(tempOutputPath);
    });

    // 3. Upload to Firebase Storage
    const bucket = admin.storage().bucket();
    const destination = `processed_videos/watermarked_${Date.now()}.mp4`;
    await bucket.upload(tempOutputPath, {
      destination,
      metadata: { contentType: 'video/mp4' }
    });

    const file = bucket.file(destination);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2500' // Far future
    });

    return url;
  } catch (error) {
    logger.error("Error watermarking video:", error);
    throw error;
  } finally {
    // Cleanup
    [tempVideoPath, tempLogoPath, tempOutputPath].forEach(p => {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });
  }
}
