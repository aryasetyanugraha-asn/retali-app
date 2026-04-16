import * as functions from "firebase-functions/v1";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import axios from "axios";

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
 * Function to post to Facebook Page via Graph API
 */
async function postToFacebookGraphAPI(token: string, pageId: string, message: string, imageUrl?: string): Promise<boolean> {
  logger.info("Facebook Graph API call", { pageId, message, imageUrl: imageUrl ? "yes" : "no" });

  try {
    let url = `https://graph.facebook.com/v19.0/${pageId}/feed`;
    let data: any = {
      message: message,
      access_token: token
    };

    if (imageUrl) {
        url = `https://graph.facebook.com/v19.0/${pageId}/photos`;
        data.url = imageUrl;
    }

    const response = await axios.post(url, data);
    logger.info("Successfully posted to Facebook Graph API", { id: response.data.id });
    return true;
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    logger.error("Error posting to Facebook Graph API", { error: errorMsg });
    throw new Error(errorMsg);
  }
}

/**
 * Function to post to Instagram User via Graph API
 */
async function postToInstagramGraphAPI(token: string, igUserId: string, message: string, imageUrl?: string): Promise<boolean> {
  logger.info("Instagram Graph API call", { igUserId, message, imageUrl: imageUrl ? "yes" : "no" });

  if (!imageUrl) {
      logger.error("Instagram requires an image or video to post.");
      throw new Error("Instagram requires an image or video to post.");
  }

  try {
    // 1. Create Media Container
    const containerUrl = `https://graph.facebook.com/v19.0/${igUserId}/media`;
    const containerData = {
      image_url: imageUrl,
      caption: message,
      access_token: token
    };

    const containerResponse = await axios.post(containerUrl, containerData);
    const creationId = containerResponse.data.id;

    logger.info("Created Instagram Media Container", { creationId });

    // 2. Publish Media Container
    const publishUrl = `https://graph.facebook.com/v19.0/${igUserId}/media_publish`;
    const publishData = {
      creation_id: creationId,
      access_token: token
    };

    const publishResponse = await axios.post(publishUrl, publishData);
    logger.info("Successfully published to Instagram", { id: publishResponse.data.id });

    return true;
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    logger.error("Error posting to Instagram Graph API", { error: errorMsg });
    throw new Error(errorMsg);
  }
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
    throw new Error("Invalid post data: missing userId, platforms array, or empty platforms array.");
  }

  const userId = postData.userId;
  const content = postData.content;
  const imageUrl = postData.imageUrl;

  let allSuccessful = true;
  let errors: string[] = [];

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
        errors.push(`${normalizedPlatform}: Integration not found`);
        continue;
      }

      const tokenData = integrationDoc.data();
      const accessToken = tokenData?.accessToken;

      if (!accessToken) {
         logger.error(`Access token missing in integration ${normalizedPlatform} for user ${userId}. Skipping this platform.`);
         allSuccessful = false;
         errors.push(`${normalizedPlatform}: Access token missing`);
         continue;
      }

      let success = false;

      // Call appropriate API
      if (normalizedPlatform === 'facebook') {
        const pageId = tokenData?.pageId || tokenData?.authResponse?.userID;
        if (!pageId) {
             logger.error(`Page ID missing for Facebook integration user ${userId}`);
             allSuccessful = false;
             errors.push(`facebook: Page ID missing`);
             continue;
        }
        success = await postToFacebookGraphAPI(accessToken, pageId, content, imageUrl);
      } else if (normalizedPlatform === 'instagram') {
        const igUserId = tokenData?.igUserId || tokenData?.authResponse?.userID;
        if (!igUserId) {
            logger.error(`IG User ID missing for Instagram integration user ${userId}`);
            allSuccessful = false;
            errors.push(`instagram: IG User ID missing`);
            continue;
        }
        success = await postToInstagramGraphAPI(accessToken, igUserId, content, imageUrl);
      } else if (normalizedPlatform === 'tiktok') {
        // Assume imageUrl contains video URL for TikTok for now
        success = await postToTikTokAPI(accessToken, content, imageUrl);
      } else {
        logger.warn(`Unknown platform ${normalizedPlatform} for post ${postId}`);
        success = false;
        errors.push(`${normalizedPlatform}: Unknown platform`);
      }

      if (!success) {
        logger.error(`Failed to post to ${normalizedPlatform} for post ${postId}`);
        allSuccessful = false;
        errors.push(`${normalizedPlatform}: Failed without specific error`);
      } else {
        logger.info(`Successfully posted to ${normalizedPlatform} for post ${postId}`);
      }

    } catch (err: any) {
      logger.error(`Error processing platform ${platform} for post ${postId}:`, err);
      allSuccessful = false;
      errors.push(`${platform}: ${err.message}`);
    }
  }

  if (errors.length > 0) {
      throw new Error(errors.join(" | "));
  }

  return allSuccessful;
}
