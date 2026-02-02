import * as functions from "firebase-functions";

export const webhookHandler = functions.https.onRequest(async (req, res) => {
    // Basic verification and handling
    // TODO: Implement Meta/WhatsApp webhook verification
    functions.logger.info("Webhook received", { body: req.body, query: req.query });
    res.status(200).send("Webhook received");
});
