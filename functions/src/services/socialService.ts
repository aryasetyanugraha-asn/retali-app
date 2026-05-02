import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import axios from "axios";

interface PostRequest {
    content: string;
    imageUrl?: string;
    platform: 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK';
}

export const postToSocial = onCall({ region: "asia-southeast2", cors: true }, async (request) => {
    const { data, auth: contextAuth } = request;
    const postData = data as PostRequest;

    // 1. Auth Check
    if (!contextAuth) {
         throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    try {
        const platform = postData.platform.toLowerCase();

        // Fetch user's token for this platform
        const integrationRef = admin.firestore().doc(`users/${contextAuth.uid}/integrations/${platform}`);
        const integrationDoc = await integrationRef.get();

        if (!integrationDoc.exists) {
            throw new HttpsError('not-found', `Integration ${platform} not found.`);
        }

        const tokenData = integrationDoc.data();
        const accessToken = tokenData?.accessToken;

        if (!accessToken) {
             throw new HttpsError('not-found', `Access token missing in integration ${platform}.`);
        }

        let success = false;

        // Call appropriate API
        if (platform === 'instagram') {
            success = await postToInstagramAPI(accessToken, postData.content, postData.imageUrl);
        } else if (platform === 'facebook') {
            success = await postToFacebookGraphAPI(accessToken, postData.content, postData.imageUrl);
        } else if (platform === 'tiktok') {
            success = await postToTikTokAPI(accessToken, postData.content, postData.imageUrl);
        } else {
            throw new HttpsError('invalid-argument', `Unknown platform ${platform}`);
        }

        if (!success) {
            throw new HttpsError('internal', `Failed to post to ${platform}`);
        }

        return {
            success: true,
            message: `Successfully posted to ${postData.platform}`
        };

    } catch (err: any) {
        logger.error(`Error processing direct post to platform ${postData.platform}:`, err);
        throw new HttpsError('internal', err.message || 'An error occurred while posting');
    }
});

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
    // 1. Token is already a Page Access Token, so we just get the instagram_business_account ID directly from /me
    const meUrl = `https://graph.facebook.com/v24.0/me?fields=instagram_business_account&access_token=${token}`;
    const meResponse = await axios.get(meUrl);

    let igUserId = meResponse.data.instagram_business_account?.id;

    if (!igUserId) {
      throw new Error("No connected Instagram Business Account found for this page token.");
    }

    logger.info(`Found Instagram User ID: ${igUserId}`);

    // 2. Create Media Container
    const mediaContainerUrl = `https://graph.facebook.com/v24.0/${igUserId}/media`;
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
    const mediaPublishUrl = `https://graph.facebook.com/v24.0/${igUserId}/media_publish`;
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
    // 1. Token is already a Page Access Token, so we just get the page ID from /me
    const meUrl = `https://graph.facebook.com/v24.0/me?access_token=${token}`;
    const meResponse = await axios.get(meUrl);

    const pageId = meResponse.data.id;
    if (!pageId) {
      throw new Error("Could not determine Page ID from token.");
    }

    logger.info(`Found Facebook Page ID: ${pageId}`);

    // 2. Publish to Facebook Page
    let publishUrl;
    let params: any = {
        access_token: token,
    };

    if (imageUrl) {
        publishUrl = `https://graph.facebook.com/v24.0/${pageId}/photos`;
        params.url = imageUrl;
        params.message = message;
    } else {
        publishUrl = `https://graph.facebook.com/v24.0/${pageId}/feed`;
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
        // 2. Fetch conversation
        const conversationRef = admin.firestore().collection("conversations").doc(conversationId);
        const conversationDoc = await conversationRef.get();

        if (!conversationDoc.exists) {
            throw new HttpsError('not-found', `Conversation not found.`);
        }

        const conversationData = conversationDoc.data();
        const recipientId = conversationData?.recipientId;

        if (!recipientId) {
             throw new HttpsError('not-found', `recipientId missing in conversation document.`);
        }

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

        // Call Meta Graph API to send message
        // Since the token is a Page Access Token, we just use /me/messages for both FB and IG
        const url = `https://graph.facebook.com/v24.0/me/messages?access_token=${accessToken}`;

        const payload = {
            recipient: { id: participantId },
            message: { text: text },
            messaging_type: "RESPONSE"
        };

        // HARDCORE DEBUGGING LOGS - DO NOT REMOVE
        console.log("=== SEND API DEBUG ===");
        console.log("Platform:", platform);
        console.log("Extracted Token:", accessToken ? `Starts with ${accessToken.substring(0,10)}...` : "UNDEFINED OR NULL");
        console.log("Constructed URL:", url);
        console.log("Payload:", JSON.stringify(payload));
        console.log("======================");

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error("META API ERROR:", JSON.stringify(responseData));
            throw new Error(responseData.error?.message || "Failed to send Meta message");
        }

        const messageId = responseData.message_id || `sent_${Date.now()}`;
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
