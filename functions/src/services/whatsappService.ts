import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import axios from "axios";

export const sendWhatsAppMessage = onCall({
  cors: true,
  region: "asia-southeast2",
}, async (request) => {
  // 1. Validate Authentication
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be logged in to send a WhatsApp message."
    );
  }

  const { phoneNumber, text, conversationId } = request.data;

  if (!phoneNumber || !text || !conversationId) {
    throw new HttpsError(
      "invalid-argument",
      "Missing phoneNumber, text, or conversationId."
    );
  }

  // Get WhatsApp credentials from environment variables
  const accessToken = process.env.WA_ACCESS_TOKEN;
  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    logger.error("WhatsApp credentials not configured.");
    throw new HttpsError(
      "failed-precondition",
      "WhatsApp integration is not fully configured on the server."
    );
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

    const data = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phoneNumber,
      type: "text",
      text: {
        preview_url: false,
        body: text
      }
    };

    const response = await axios.post(url, data, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const responseData = response.data;

    if (responseData.error) {
       logger.error("WhatsApp API error response:", responseData);
       throw new HttpsError("internal", `WhatsApp API Error: ${responseData.error.message}`);
    }

    // Get the message ID returned by Meta
    const messageId = responseData.messages?.[0]?.id || `sent_${Date.now()}`;

    const timestamp = admin.firestore.Timestamp.now();

    // 2. Save the message to Firestore
    const conversationRef = admin.firestore().collection("conversations").doc(conversationId);
    const messagesRef = conversationRef.collection("messages");

    await messagesRef.doc(messageId).set({
      id: messageId,
      sender: "me",
      text: text,
      timestamp: timestamp,
      platform: "WHATSAPP",
    });

    // 3. Update the conversation document
    await conversationRef.set({
      lastMessage: text,
      lastMessageTime: timestamp,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    logger.info(`Successfully sent WhatsApp message ${messageId} to ${phoneNumber}`);

    return {
      success: true,
      messageId: messageId,
      message: "Message sent successfully."
    };

  } catch (error: any) {
    logger.error("Error sending WhatsApp message:", error.response?.data || error.message);
    throw new HttpsError("internal", "Failed to send WhatsApp message.");
  }
});
