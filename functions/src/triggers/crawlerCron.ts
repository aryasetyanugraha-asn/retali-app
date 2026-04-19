import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { crawlWebsites } from "../services/crawlerService";

export const scheduledDataCrawler = onSchedule({
  schedule: "every 6 hours",
  region: "asia-southeast2",
  timeoutSeconds: 300, // 5 minutes
  memory: "512MiB"
}, async (event) => {
  logger.info("Starting scheduled data crawler");

  const db = admin.firestore();

  try {
    await crawlWebsites(db);
    logger.info("Finished scheduled data crawler successfully.");
  } catch (error) {
    logger.error("Error running scheduled data crawler:", error);
  }
});
