import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import axios from "axios";

// Helper to get access token from integrations collection based on pageId/accountId
async function getPageAccessToken(accountId: string, platform: string): Promise<string | null> {
  try {
    const db = admin.firestore();

    // Instead of collection group query, find a user with PUSAT role
    // and look up their specific platform integration document.
    const usersSnapshot = await db.collection("users")
      .where("role", "==", "PUSAT")
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
        return null;
    }

    const userId = usersSnapshot.docs[0].id;
    let targetPlatform = platform === "FACEBOOK" ? "facebook" : platform === "INSTAGRAM" ? "instagram" : null;

    if (!targetPlatform) return null;

    const integrationDoc = await db.collection("users")
      .doc(userId)
      .collection("integrations")
      .doc(targetPlatform)
      .get();

    if (integrationDoc.exists) {
      const data = integrationDoc.data();
      if (data && data.accessToken) {
        return data.accessToken;
      }
    }

    return null;
  } catch (error) {
    logger.error("Error getting page access token", error);
    return null;
  }
}

export const metaSocialWebhook = onRequest({
  region: "asia-southeast2",
  cors: true,
}, async (req, res) => {
  // 1. Handle GET request for Webhook Verification (Meta)
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

    if (mode && token) {
      if (mode === "subscribe" && token === verifyToken) {
        logger.info("META_SOCIAL_WEBHOOK_VERIFIED");
        res.status(200).send(challenge);
        return;
      } else {
        logger.warn("META_SOCIAL_WEBHOOK_VERIFICATION_FAILED", { token, verifyToken });
        res.sendStatus(403);
        return;
      }
    } else {
      logger.warn("META_SOCIAL_MISSING_WEBHOOK_PARAMETERS");
      res.sendStatus(400);
      return;
    }
  }

  // 2. Handle POST request for incoming events (Meta Pages / Instagram)
  if (req.method === "POST") {
    const body = req.body;

    // Securely log the incoming payload
    logger.info("INCOMING_META_SOCIAL_WEBHOOK_PAYLOAD", { body: JSON.stringify(body) });

    try {
      // Check if it's from a Facebook Page or Instagram
      if (body.object === "page" || body.object === "instagram") {
        logger.info(`Received event from object type: ${body.object}`);

        const platform = body.object === "page" ? "FACEBOOK" : "INSTAGRAM";

        for (const entry of body.entry) {
          const recipientId = entry.id; // page id or instagram account id

          if (entry.messaging) {
            // Messenger / Instagram Direct Messages
            for (const messagingEvent of entry.messaging) {
              if (messagingEvent.message && !messagingEvent.message.is_echo) {
                const senderId = messagingEvent.sender.id;
                const messageId = messagingEvent.message.mid;
                const text = messagingEvent.message.text || "";
                const timestamp = messagingEvent.timestamp;

                let conversationId = `meta_${platform.toLowerCase()}_${senderId}`;

                const conversationRef = admin.firestore().collection("conversations").doc(conversationId);
                const messagesRef = conversationRef.collection("messages");

                // Check if conversation already exists to avoid redundant API calls
                const conversationDoc = await conversationRef.get();
                let senderName = `User ${senderId}`;
                let avatarUrl = "";

                if (!conversationDoc.exists || !conversationDoc.data()?.avatarUrl) {
                   // Profile Resolution (Phase 3)
                   const pageAccessToken = await getPageAccessToken(recipientId, platform);
                   if (pageAccessToken) {
                     try {
                       let fields = platform === "FACEBOOK" ? "first_name,last_name,profile_pic" : "name,profile_pic";
                       const profileUrl = `https://graph.facebook.com/v21.0/${senderId}?fields=${fields}&access_token=${pageAccessToken}`;
                       const profileResponse = await axios.get(profileUrl);

                       if (platform === "FACEBOOK") {
                         senderName = `${profileResponse.data.first_name || ''} ${profileResponse.data.last_name || ''}`.trim() || senderName;
                       } else {
                         senderName = profileResponse.data.name || senderName;
                       }
                       avatarUrl = profileResponse.data.profile_pic || "";
                     } catch (err: any) {
                       logger.error(`Failed to resolve profile for ${senderId}`, err.response?.data || err.message);
                     }
                   }
                } else {
                   senderName = conversationDoc.data()?.name || senderName;
                   avatarUrl = conversationDoc.data()?.avatarUrl || avatarUrl;
                }

                await messagesRef.doc(messageId).set({
                  id: messageId,
                  sender: "them",
                  text: text,
                  timestamp: admin.firestore.Timestamp.fromMillis(parseInt(timestamp)),
                  platform: platform,
                  messageType: "message"
                });

                const conversationData: any = {
                  id: conversationId,
                  participantId: senderId,
                  recipientId: recipientId, // Save this for sending replies
                  name: senderName,
                  platform: platform,
                  lastMessage: text,
                  lastMessageTime: admin.firestore.Timestamp.fromMillis(parseInt(timestamp)),
                  unread: admin.firestore.FieldValue.increment(1),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                };

                if (avatarUrl) {
                  conversationData.avatarUrl = avatarUrl;
                }

                await conversationRef.set(conversationData, { merge: true });

                logger.info(`Saved ${platform} message from ${senderId}`);
              }
            }
          }

          if (entry.changes) {
            // Comments (Feed)
            for (const change of entry.changes) {
              if (change.value && change.value.item === "comment" && change.value.verb === "add") {
                const senderId = change.value.from.id;
                const senderNamePayload = change.value.from.name;
                const commentId = change.value.comment_id;
                const text = change.value.text;
                const timestamp = change.value.created_time; // usually unix timestamp

                let conversationId = `meta_${platform.toLowerCase()}_comment_${senderId}`;

                const conversationRef = admin.firestore().collection("conversations").doc(conversationId);
                const messagesRef = conversationRef.collection("messages");

                let senderName = senderNamePayload || `User ${senderId}`;
                let avatarUrl = "";

                // Try to resolve avatar if not present
                const conversationDoc = await conversationRef.get();
                if (!conversationDoc.exists || !conversationDoc.data()?.avatarUrl) {
                   const pageAccessToken = await getPageAccessToken(recipientId, platform);
                   if (pageAccessToken) {
                     try {
                       let fields = platform === "FACEBOOK" ? "profile_pic" : "profile_pic";
                       const profileUrl = `https://graph.facebook.com/v21.0/${senderId}?fields=${fields}&access_token=${pageAccessToken}`;
                       const profileResponse = await axios.get(profileUrl);

                       avatarUrl = profileResponse.data.profile_pic || "";
                     } catch (err: any) {
                       logger.error(`Failed to resolve profile pic for comment sender ${senderId}`, err.response?.data || err.message);
                     }
                   }
                } else {
                   senderName = conversationDoc.data()?.name || senderName;
                   avatarUrl = conversationDoc.data()?.avatarUrl || avatarUrl;
                }

                await messagesRef.doc(commentId).set({
                  id: commentId,
                  sender: "them",
                  text: text,
                  timestamp: admin.firestore.Timestamp.fromMillis(parseInt(timestamp) * 1000),
                  platform: platform,
                  messageType: "comment"
                });

                const conversationData: any = {
                  id: conversationId,
                  participantId: senderId,
                  recipientId: recipientId,
                  name: senderName,
                  platform: platform,
                  lastMessage: text,
                  lastMessageTime: admin.firestore.Timestamp.fromMillis(parseInt(timestamp) * 1000),
                  unread: admin.firestore.FieldValue.increment(1),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                };

                if (avatarUrl) {
                  conversationData.avatarUrl = avatarUrl;
                }

                await conversationRef.set(conversationData, { merge: true });

                logger.info(`Saved ${platform} comment from ${senderId}`);
              }
            }
          }
        }

        // Always return 200 OK to acknowledge receipt, otherwise Meta will retry
        res.status(200).send("EVENT_RECEIVED");
        return;
      } else {
        logger.warn("UNKNOWN_META_SOCIAL_WEBHOOK_PAYLOAD_OBJECT", { object: body.object });
        res.status(404).send("Not Found");
        return;
      }
    } catch (error) {
      logger.error("ERROR_PROCESSING_META_SOCIAL_WEBHOOK", error);
      res.status(500).send("Internal Server Error");
      return;
    }
  }

  // Handle other HTTP methods
  res.status(405).send("Method Not Allowed");
});
