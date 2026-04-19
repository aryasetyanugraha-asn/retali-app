import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { crawlWebsites } from "../services/crawlerService";

export const manualDataCrawl = onCall({
    region: "asia-southeast2",
    cors: true,
    timeoutSeconds: 300,
    memory: "512MiB"
}, async (request) => {
    const db = admin.firestore();
    await crawlWebsites(db);
    return { success: true, message: "Crawling completed manually" };
});
