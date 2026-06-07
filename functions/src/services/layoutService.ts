import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { applyWatermarkAndUpload } from "./imageService";

export const saveLayoutContent = onCall({
  cors: true,
  region: "asia-southeast2",
  timeoutSeconds: 60,
  memory: "1GiB"
}, async (request) => {
  // Validate Authentication
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be logged in to save layout content."
    );
  }

  const { base64Image } = request.data;

  if (!base64Image) {
    throw new HttpsError(
      "invalid-argument",
      "base64Image is required."
    );
  }

  try {
    const imageUrl = await applyWatermarkAndUpload(base64Image);

    return {
      success: true,
      imageUrl: imageUrl,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error("Error saving layout content:", error);
    throw new HttpsError("internal", "Failed to save layout content.");
  }
});
