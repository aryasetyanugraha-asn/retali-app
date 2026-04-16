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
 * Function to post to Instagram via Graph API
 */
async function postToInstagramAPI(token: string, message: string, imageUrl?: string): Promise<boolean> {
  logger.info("Instagram Graph API call", { tokenPrefix: token.substring(0, 10), message, imageUrl });

  if (!imageUrl) {
    throw new Error("Instagram requires an image URL to post.");
  }

  try {
    // 1. Get Facebook Page associated with the User Token and find Instagram Business Account ID
    const accountsUrl = `https://graph.facebook.com/v21.0/me/accounts?fields=instagram_business_account&access_token=${token}`;
    const accountsResponse = await axios.get(accountsUrl);

    let igUserId = null;
    const pages = accountsResponse.data.data;

    for (const page of pages) {
      if (page.instagram_business_account && page.instagram_business_account.id) {
        igUserId = page.instagram_business_account.id;
        break; // Use the first connected IG account we find
      }
    }

    if (!igUserId) {
      throw new Error("No connected Instagram Business Account found for this user.");
    }

    logger.info(`Found Instagram User ID: ${igUserId}`);

    // 2. Create Media Container
    const mediaContainerUrl = `https://graph.facebook.com/v21.0/${igUserId}/media`;
    const mediaContainerResponse = await axios.post(mediaContainerUrl, null, {
      params: {
        image_url: imageUrl,
        caption: message,
        access_token: token,
      }
    });

    const containerId = mediaContainerResponse.data.id;
    if (!containerId) {
      throw new Error("Failed to create media container.");
    }

    logger.info(`Created media container: ${containerId}`);

    // 3. Publish Media Container
    const mediaPublishUrl = `https://graph.facebook.com/v21.0/${igUserId}/media_publish`;
    const mediaPublishResponse = await axios.post(mediaPublishUrl, null, {
      params: {
        creation_id: containerId,
        access_token: token,
      }
    });

    if (mediaPublishResponse.data.id) {
      logger.info(`Successfully published Instagram media: ${mediaPublishResponse.data.id}`);
      return true;
    } else {
       throw new Error("Publishing failed to return a post ID.");
    }

  } catch (error: any) {
    logger.error("Error posting to Instagram:", error.response?.data || error.message);
    const errorMessage = error.response?.data?.error?.message || error.message || "Unknown Meta API Error";
    throw new Error(errorMessage);
  }
}

/**
 * Mock function to simulate posting to Facebook via Graph API
 */
async function postToFacebookGraphAPI(token: string, message: string, imageUrl?: string): Promise<boolean> {
  logger.info("Mock Facebook Graph API call", { tokenPrefix: token.substring(0, 10), message, imageUrl });

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

      // Call appropriate API
      if (normalizedPlatform === 'instagram') {
        success = await postToInstagramAPI(accessToken, content, imageUrl);
      } else if (normalizedPlatform === 'facebook') {
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

    } catch (err: any) {
      logger.error(`Error processing platform ${platform} for post ${postId}:`, err);
      allSuccessful = false;
      throw err;
    }
  }

  return allSuccessful;
}
