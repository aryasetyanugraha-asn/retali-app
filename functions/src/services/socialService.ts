import * as functions from "firebase-functions/v1";
import { onCall, HttpsError } from "firebase-functions/v2/https";
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

    try {
        const platform = data.platform.toLowerCase();

        // Fetch user's token for this platform
        const integrationRef = admin.firestore().doc(`users/${context.auth.uid}/integrations/${platform}`);
        const integrationDoc = await integrationRef.get();

        if (!integrationDoc.exists) {
            throw new functions.https.HttpsError('not-found', `Integration ${platform} not found.`);
        }

        const tokenData = integrationDoc.data();
        const accessToken = tokenData?.accessToken;

        if (!accessToken) {
             throw new functions.https.HttpsError('not-found', `Access token missing in integration ${platform}.`);
        }

        let success = false;

        // Call appropriate API
        if (platform === 'instagram') {
            success = await postToInstagramAPI(accessToken, data.content, data.imageUrl);
        } else if (platform === 'facebook') {
            success = await postToFacebookGraphAPI(accessToken, data.content, data.imageUrl);
        } else if (platform === 'tiktok') {
            success = await postToTikTokAPI(accessToken, data.content, data.imageUrl);
        } else {
            throw new functions.https.HttpsError('invalid-argument', `Unknown platform ${platform}`);
        }

        if (!success) {
            throw new functions.https.HttpsError('internal', `Failed to post to ${platform}`);
        }

        return {
            success: true,
            message: `Successfully posted to ${data.platform}`
        };

    } catch (err: any) {
        logger.error(`Error processing direct post to platform ${data.platform}:`, err);
        throw new functions.https.HttpsError('internal', err.message || 'An error occurred while posting');
    }
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
  logger.info("Facebook Graph API call", { tokenPrefix: token.substring(0, 10), message, imageUrl });

  try {
    // 1. Get Facebook Pages associated with the user token
    const accountsUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${token}`;
    const accountsResponse = await axios.get(accountsUrl);

    const pages = accountsResponse.data.data;
    if (!pages || pages.length === 0) {
      throw new Error("No connected Facebook Pages found for this user.");
    }

    // Use the first page found
    const page = pages[0];
    const pageId = page.id;
    const pageAccessToken = page.access_token;

    logger.info(`Found Facebook Page ID: ${pageId}`);

    // 2. Publish to Facebook Page
    let publishUrl;
    let params: any = {
        access_token: pageAccessToken,
    };

    if (imageUrl) {
        publishUrl = `https://graph.facebook.com/v21.0/${pageId}/photos`;
        params.url = imageUrl;
        params.message = message;
    } else {
        publishUrl = `https://graph.facebook.com/v21.0/${pageId}/feed`;
        params.message = message;
    }

    const publishResponse = await axios.post(publishUrl, params);

    logger.info(`Successfully published to Facebook Page: ${publishResponse.data.id}`);
    return true;

  } catch (error: any) {
    logger.error("Error posting to Facebook:", error.response?.data || error.message);
    const errorMessage = error.response?.data?.error?.message || error.message || "Unknown Meta API Error";
    throw new Error(errorMessage);
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

/**
 * Callable function to reply to a Meta (Facebook/Instagram) message
 */
export const replyToMetaMessage = onCall({ region: "asia-southeast2", cors: true }, async (request) => {
    const { data, auth: contextAuth } = request;

    // 1. Auth Check
    if (!contextAuth) {
         throw new HttpsError('unauthenticated', 'User must be logged in to send a message.');
    }

    const { conversationId, participantId, platform, text } = data;

    if (!conversationId || !participantId || !platform || !text) {
        throw new HttpsError('invalid-argument', 'Missing required fields.');
    }

    const normalizedPlatform = platform.toLowerCase();

    try {
        // Fetch user's token for this platform
        const integrationRef = admin.firestore().doc(`users/${contextAuth.uid}/integrations/${normalizedPlatform}`);
        const integrationDoc = await integrationRef.get();

        if (!integrationDoc.exists) {
            throw new HttpsError('not-found', `Integration ${normalizedPlatform} not found.`);
        }

        const tokenData = integrationDoc.data();
        const accessToken = tokenData?.accessToken;

        if (!accessToken) {
             throw new HttpsError('not-found', `Access token missing in integration ${normalizedPlatform}.`);
        }

        // 2. Fetch conversation to get recipientId (the page or IG account ID)
        const conversationRef = admin.firestore().collection("conversations").doc(conversationId);
        const conversationDoc = await conversationRef.get();
        let targetPageId = conversationDoc.exists ? conversationDoc.data()?.recipientId : null;

        let pageAccessToken = accessToken;
        let sendEndpointId = "me";

        const accountsUrl = `https://graph.facebook.com/v21.0/me/accounts?fields=access_token,id,name,instagram_business_account&access_token=${accessToken}`;
        const accountsResponse = await axios.get(accountsUrl);
        const pages = accountsResponse.data.data;

        if (!pages || pages.length === 0) {
             throw new HttpsError('failed-precondition', 'No connected Meta Pages found.');
        }

        let foundPage = null;

        if (normalizedPlatform === 'facebook') {
            if (targetPageId) {
                foundPage = pages.find((p: any) => p.id === targetPageId);
            }
            if (!foundPage) {
                foundPage = pages[0]; // fallback to first page
            }
            pageAccessToken = foundPage.access_token;
            sendEndpointId = foundPage.id;
        } else if (normalizedPlatform === 'instagram') {
            if (targetPageId) {
                foundPage = pages.find((p: any) => p.instagram_business_account?.id === targetPageId);
            }
            if (!foundPage) {
                // Fallback: Find the first page with an IG account
                foundPage = pages.find((p: any) => p.instagram_business_account?.id);
            }

            if (!foundPage || !foundPage.instagram_business_account) {
                throw new HttpsError('failed-precondition', 'No connected Instagram Business Account found.');
            }
            pageAccessToken = foundPage.access_token;
            sendEndpointId = foundPage.instagram_business_account.id;
        }

        // Call Meta Graph API to send message
        const url = `https://graph.facebook.com/v21.0/${sendEndpointId}/messages`;

        const payload = {
            recipient: { id: participantId },
            message: { text: text },
            messaging_type: "RESPONSE"
        };

        const response = await axios.post(url, payload, {
            params: { access_token: pageAccessToken }
        });

        const messageId = response.data.message_id || `sent_${Date.now()}`;
        const timestamp = admin.firestore.Timestamp.now();

        // Save the message to Firestore
        const messagesRef = conversationRef.collection("messages");

        await messagesRef.doc(messageId).set({
            id: messageId,
            sender: "me",
            text: text,
            timestamp: timestamp,
            platform: platform,
        });

        // Update the conversation document
        await conversationRef.set({
            lastMessage: text,
            lastMessageTime: timestamp,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        logger.info(`Successfully replied to ${platform} conversation ${conversationId}`);

        return {
            success: true,
            messageId: messageId,
            message: "Message sent successfully."
        };

    } catch (err: any) {
        logger.error(`Error sending reply to ${platform}:`, err.response?.data || err.message);
        throw new HttpsError('internal', err.response?.data?.error?.message || err.message || 'An error occurred while sending message');
    }
});
