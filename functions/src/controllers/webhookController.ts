import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

export const webhookHandler = onRequest({ region: "asia-southeast2" }, async (req, res) => {
    // Basic verification and handling
    // TODO: Implement Meta/WhatsApp webhook verification
    logger.info("Webhook received", { body: req.body, query: req.query });
    res.status(200).send("Webhook received");
});
