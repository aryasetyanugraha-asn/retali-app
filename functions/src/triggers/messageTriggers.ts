/**
 * CRUCIAL CONTEXT - Meta API Integration
 * The Meta Access Token stored in Firestore (integrations > facebook > accessToken or integrations > instagram > accessToken)
 * is ALREADY a permanent Page Access Token, NOT a User Token.
 *
 * 1. Do not attempt to call `/me/accounts` to fetch page tokens from the user token. Use the stored token directly.
 * 2. Instagram Publishing Flow: Call `GET /v24.0/me?fields=instagram_business_account&access_token={THE_STORED_TOKEN}` directly to get the IG Business ID.
 * 3. Inbox Replies: Use the stored token directly to hit `POST /v24.0/me/messages` for both FB and IG replies.
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const KEYWORDS = ["harga", "berapa", "jadwal", "dp", "ktp", "cicilan", "biaya"];

export const autoScoreLeadOnMessage = onDocumentCreated(
  {
    document: "conversations/{conversationId}/messages/{messageId}",
    region: "asia-southeast2",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();

    // Only process messages sent by the customer ("them")
    if (data.sender !== "them") return;

    const text = data.text;
    if (!text || typeof text !== "string") return;

    const textLower = text.toLowerCase();

    // Check if any keyword matches
    const hasIntentKeyword = KEYWORDS.some(keyword => textLower.includes(keyword));

    if (hasIntentKeyword) {
      const conversationId = event.params.conversationId;
      logger.info(`Customer intent detected in conversation ${conversationId}. Keywords matched.`);

      try {
        const db = admin.firestore();
        const conversationDoc = await db.collection("conversations").doc(conversationId).get();

        if (!conversationDoc.exists) return;

        const conversationData = conversationDoc.data();
        if (!conversationData) return;

        // Try to find the associated lead
        // The lead might be matched by phone or by social id (participantId)
        let leadsQuery;

        if (conversationData.participantId) {
            leadsQuery = db.collection("leads").where("platform_sender_id", "==", conversationData.participantId).limit(1);
        } else if (conversationData.platform === "WHATSAPP" && conversationData.phoneNumber) {
            // Fallback for older leads that might only have phone
            leadsQuery = db.collection("leads").where("phone", "==", conversationData.phoneNumber).limit(1);
        } else if (conversationData.participantId) {
            // Fallback for older leads that might only have socialId
            leadsQuery = db.collection("leads").where("socialId", "==", conversationData.participantId).limit(1);
        }

        if (leadsQuery) {
            const leadsSnapshot = await leadsQuery.get();

            if (!leadsSnapshot.empty) {
                const leadDoc = leadsSnapshot.docs[0];
                const leadData = leadDoc.data();

                // Only update if not already HOT or WON
                if (leadData.status !== "HOT" && leadData.status !== "WON") {
                    await leadDoc.ref.update({
                        status: "HOT",
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    logger.info(`Lead ${leadDoc.id} automatically moved to HOT status based on keyword detection.`);
                }
            } else {
                logger.info(`No matching lead found for conversation ${conversationId} to auto-score.`);
            }
        }

      } catch (error) {
        logger.error("Error auto-scoring lead on message:", error);
      }
    }
  }
);
