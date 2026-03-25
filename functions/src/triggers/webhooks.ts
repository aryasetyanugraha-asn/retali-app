import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

export const catchLeadWebhook = onRequest({
  region: "asia-southeast2",
  cors: true,
}, async (req, res) => {
  // 1. Handle GET request for Webhook Verification (Meta / WhatsApp)
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

    if (mode && token) {
      if (mode === "subscribe" && token === verifyToken) {
        logger.info("WEBHOOK_VERIFIED");
        res.status(200).send(challenge);
        return;
      } else {
        logger.warn("WEBHOOK_VERIFICATION_FAILED", { token, verifyToken });
        res.sendStatus(403);
        return;
      }
    } else {
      logger.warn("MISSING_WEBHOOK_PARAMETERS");
      res.sendStatus(400);
      return;
    }
  }

  // 2. Handle POST request for incoming leads (Meta Lead Ads / Webhooks)
  if (req.method === "POST") {
    const body = req.body;

    logger.info("INCOMING_WEBHOOK_PAYLOAD", { body: JSON.stringify(body) });

    try {
      // Check if it's a Meta Lead Ad Webhook format
      if (body.object === "page") {
        for (const entry of body.entry) {
          for (const change of entry.changes) {
            // Meta Lead Ads Webhook
            if (change.field === "leadgen") {
              const leadgenId = change.value.leadgen_id;
              const formId = change.value.form_id;
              const pageId = change.value.page_id;
              const createdTime = change.value.created_time;

              logger.info(`Processing Meta Lead: ${leadgenId}`);

              // --- PLACEHOLDER LOGIC ---
              // In a real application, you would use the `leadgen_id` and a Meta Page Access Token
              // to call the Graph API: GET /v19.0/{leadgen_id} to fetch the actual lead details (Name, Phone, Email).
              // For now, we'll store a placeholder and the IDs.

              const newLead = {
                source: "Facebook Ads",
                status: "NEW",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                metaLeadId: leadgenId,
                formId: formId,
                pageId: pageId,
                metaCreatedTime: createdTime,

                // Placeholder Data - until Graph API integration is complete
                name: "New Lead (Pending Meta Sync)",
                phone: "TBD",
                email: "TBD"
              };

              // Save to Firestore
              await admin.firestore().collection("leads").add(newLead);
              logger.info(`Successfully saved lead ${leadgenId} to Firestore.`);
            }
          }
        }
      } else {
        logger.warn("UNKNOWN_WEBHOOK_PAYLOAD", { body });
      }

      // Always return 200 OK to acknowledge receipt, otherwise Meta will retry
      res.status(200).send("EVENT_RECEIVED");
      return;

    } catch (error) {
      logger.error("ERROR_PROCESSING_WEBHOOK", error);
      // Even on error, return 200 to prevent retries if it's a permanent failure,
      // but if it's a temporary DB error, returning 500 would let Meta retry.
      // Usually, it's safer to acknowledge.
      res.status(200).send("EVENT_RECEIVED_WITH_ERRORS");
      return;
    }
  }

  // Handle other HTTP methods
  res.status(405).send("Method Not Allowed");
});
