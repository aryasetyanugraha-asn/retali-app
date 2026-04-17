import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

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

                await messagesRef.doc(messageId).set({
                  id: messageId,
                  sender: "them",
                  text: text,
                  timestamp: admin.firestore.Timestamp.fromMillis(parseInt(timestamp)),
                  platform: platform,
                  messageType: "message"
                });

                await conversationRef.set({
                  id: conversationId,
                  participantId: senderId,
                  name: `User ${senderId}`, // Will need Meta Graph API to resolve actual name
                  platform: platform,
                  lastMessage: text,
                  lastMessageTime: admin.firestore.Timestamp.fromMillis(parseInt(timestamp)),
                  unread: admin.firestore.FieldValue.increment(1),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });

                logger.info(`Saved ${platform} message from ${senderId}`);
              }
            }
          }

          if (entry.changes) {
            // Comments (Feed)
            for (const change of entry.changes) {
              if (change.value && change.value.item === "comment" && change.value.verb === "add") {
                const senderId = change.value.from.id;
                const senderName = change.value.from.name;
                const commentId = change.value.comment_id;
                const text = change.value.text;
                const timestamp = change.value.created_time; // usually unix timestamp

                let conversationId = `meta_${platform.toLowerCase()}_comment_${senderId}`;

                const conversationRef = admin.firestore().collection("conversations").doc(conversationId);
                const messagesRef = conversationRef.collection("messages");

                await messagesRef.doc(commentId).set({
                  id: commentId,
                  sender: "them",
                  text: text,
                  timestamp: admin.firestore.Timestamp.fromMillis(parseInt(timestamp) * 1000),
                  platform: platform,
                  messageType: "comment"
                });

                await conversationRef.set({
                  id: conversationId,
                  participantId: senderId,
                  name: senderName || `User ${senderId}`,
                  platform: platform,
                  lastMessage: text,
                  lastMessageTime: admin.firestore.Timestamp.fromMillis(parseInt(timestamp) * 1000),
                  unread: admin.firestore.FieldValue.increment(1),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });

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
