import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

export const whatsappWebhook = onRequest({
  region: "asia-southeast2",
  cors: true,
}, async (req, res) => {
  // 1. Handle GET request for Webhook Verification
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

    if (mode && token) {
      if (mode === "subscribe" && token === verifyToken) {
        logger.info("WHATSAPP_WEBHOOK_VERIFIED");
        res.status(200).send(challenge);
        return;
      } else {
        logger.warn("WHATSAPP_WEBHOOK_VERIFICATION_FAILED", { token, verifyToken });
        res.sendStatus(403);
        return;
      }
    } else {
      logger.warn("MISSING_WHATSAPP_WEBHOOK_PARAMETERS");
      res.sendStatus(400);
      return;
    }
  }

  // 2. Handle POST request for incoming WhatsApp messages
  if (req.method === "POST") {
    const body = req.body;

    logger.info("INCOMING_WHATSAPP_WEBHOOK_PAYLOAD", { body: JSON.stringify(body) });

    try {
      if (body.object === "whatsapp_business_account") {
        for (const entry of body.entry) {
          for (const change of entry.changes) {
            if (change.value && change.value.messages) {
              for (const message of change.value.messages) {
                // We only handle text messages for now
                if (message.type === "text") {
                  const fromNumber = message.from; // Sender's WhatsApp number
                  const textBody = message.text.body;
                  const messageId = message.id;
                  const timestamp = message.timestamp; // Unix timestamp string

                  // Extract sender's name if available (usually in contacts array)
                  let senderName = fromNumber;
                  if (change.value.contacts && change.value.contacts.length > 0) {
                    const contact = change.value.contacts.find((c: any) => c.wa_id === fromNumber);
                    if (contact && contact.profile && contact.profile.name) {
                      senderName = contact.profile.name;
                    }
                  }

                  logger.info(`Processing WhatsApp message from: ${fromNumber}`);

                  const conversationId = `wa_${fromNumber}`;
                  const conversationRef = admin.firestore().collection("conversations").doc(conversationId);
                  const messagesRef = conversationRef.collection("messages");

                  // Check and create lead automatically if not found
                  const db = admin.firestore();
                  const leadsQuery = db.collection("leads").where("platform_sender_id", "==", fromNumber).limit(1);
                  const leadsSnapshot = await leadsQuery.get();

                  if (leadsSnapshot.empty) {
                     const newLead = {
                       name: senderName,
                       status: "NEW",
                       platform_sender_id: fromNumber,
                       phone: fromNumber,
                       source: "WHATSAPP",
                       createdAt: admin.firestore.FieldValue.serverTimestamp(),
                     };
                     await db.collection("leads").add(newLead);
                     logger.info(`Automatically created new lead from WHATSAPP for platform_sender_id ${fromNumber}`);
                  }

                  // Save the message
                  await messagesRef.doc(messageId).set({
                    id: messageId,
                    sender: "them",
                    text: textBody,
                    timestamp: admin.firestore.Timestamp.fromMillis(parseInt(timestamp) * 1000),
                    platform: "WHATSAPP",
                  });

                  // Update or create the conversation document
                  await conversationRef.set({
                    id: conversationId,
                    name: senderName,
                    platform: "WHATSAPP",
                    lastMessage: textBody,
                    lastMessageTime: admin.firestore.Timestamp.fromMillis(parseInt(timestamp) * 1000),
                    phoneNumber: fromNumber,
                    // Use FieldValue.increment to update unread count
                    unread: admin.firestore.FieldValue.increment(1),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  }, { merge: true });

                  logger.info(`Successfully saved WhatsApp message ${messageId} to Firestore.`);
                }
              }
            }
          }
        }
      } else {
        logger.warn("UNKNOWN_WHATSAPP_WEBHOOK_PAYLOAD", { body });
      }

      // Always return 200 OK to acknowledge receipt, otherwise Meta will retry
      res.status(200).send("EVENT_RECEIVED");
      return;

    } catch (error) {
      logger.error("ERROR_PROCESSING_WHATSAPP_WEBHOOK", error);
      res.status(200).send("EVENT_RECEIVED_WITH_ERRORS");
      return;
    }
  }

  // Handle other HTTP methods
  res.status(405).send("Method Not Allowed");
});
