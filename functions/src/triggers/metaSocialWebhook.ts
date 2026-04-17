import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

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

        // At this stage, we only log the payload.
        // We will process and save these to Firestore in the next iteration.

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
