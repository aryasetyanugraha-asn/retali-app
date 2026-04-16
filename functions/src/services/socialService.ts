import * as functions from "firebase-functions/v1";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

interface PostRequest {
    content: string;
    imageUrl?: string;
    platform: 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK';
}

export const postToSocial = async (data: PostRequest, context: functions.https.CallableContext) => {
    // 1. Auth Check
    if (!context.auth) {
         throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    // 2. Logic to fetch user's access token from Firestore (users/{uid}/tokens)
    // const userRef = admin.firestore().collection('users').doc(context.auth.uid);
    // ...

    // 3. Call Meta Graph API
    // axios.post(...)

    return {
        success: true,
        message: `Simulated posting to ${data.platform}`
    };
};

// --- Scheduled Posts Logic ---

/**
 * Mock function to simulate posting to Facebook/Instagram via Graph API
 */
async function postToFacebookGraphAPI(token: string, message: string, imageUrl?: string): Promise<boolean> {
  logger.info("Mock Facebook/Instagram Graph API call", { tokenPrefix: token.substring(0, 10), message, imageUrl });

  // Simulated success
  return true;
}

/**
 * Mock function to simulate posting to TikTok via TikTok API
 */
async function postToTikTokAPI(token: string, message: string, videoUrl?: string): Promise<boolean> {
  logger.info("Mock TikTok API call", { tokenPrefix: token.substring(0, 10), message, videoUrl });

  // Simulated success
  return true;
}

/**
 * Processes a single scheduled post.
 * Determines the target platforms, fetches tokens, and posts.
 * @param postId The ID of the post
 * @param postData The data of the post document
 * @param db Firestore instance
 * @returns true if successful on all requested platforms, false otherwise
 */
export async function processScheduledPost(postId: string, postData: any, db: admin.firestore.Firestore): Promise<boolean> {
  logger.info(`Processing post ${postId} for user ${postData.userId}`);

  if (!postData.userId || !postData.platforms || !Array.isArray(postData.platforms) || postData.platforms.length === 0) {
    logger.error(`Invalid post data for ${postId}: missing userId, platforms array, or empty platforms array.`);
    return false;
  }

  const userId = postData.userId;
  const content = postData.content;
  const imageUrl = postData.imageUrl;

  let allSuccessful = true;

  for (const platform of postData.platforms) {
    try {
      const normalizedPlatform = platform.toLowerCase();
      logger.info(`Attempting to post to ${normalizedPlatform} (original: ${platform}) for user ${userId}`);

      // Fetch user's token for this platform
      const integrationRef = db.doc(`users/${userId}/integrations/${normalizedPlatform}`);
      const integrationDoc = await integrationRef.get();

      if (!integrationDoc.exists) {
        logger.error(`Integration ${normalizedPlatform} not found for user ${userId}. Skipping this platform.`);
        allSuccessful = false;
        continue;
      }

      const tokenData = integrationDoc.data();
      const accessToken = tokenData?.accessToken;

      if (!accessToken) {
         logger.error(`Access token missing in integration ${normalizedPlatform} for user ${userId}. Skipping this platform.`);
         allSuccessful = false;
         continue;
      }

      let success = false;

      // Call appropriate mock API
      if (normalizedPlatform === 'facebook' || normalizedPlatform === 'instagram') {
        success = await postToFacebookGraphAPI(accessToken, content, imageUrl);
      } else if (normalizedPlatform === 'tiktok') {
        // Assume imageUrl contains video URL for TikTok for now
        success = await postToTikTokAPI(accessToken, content, imageUrl);
      } else {
        logger.warn(`Unknown platform ${normalizedPlatform} for post ${postId}`);
        success = false;
      }

      if (!success) {
        logger.error(`Failed to post to ${normalizedPlatform} for post ${postId}`);
        allSuccessful = false;
      } else {
        logger.info(`Successfully posted to ${normalizedPlatform} for post ${postId}`);
      }

    } catch (err) {
      logger.error(`Error processing platform ${platform} for post ${postId}:`, err);
      allSuccessful = false;
    }
  }

  return allSuccessful;
}
