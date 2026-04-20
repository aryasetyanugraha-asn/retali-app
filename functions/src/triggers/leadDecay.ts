import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

export const processLeadDecay = onSchedule({
  schedule: "0 0 * * *", // Every day at midnight
  region: "asia-southeast2",
  timeoutSeconds: 300,
  memory: "256MiB"
}, async (event) => {
  logger.info("Starting lead decay processing");

  const db = admin.firestore();

  // Calculate the timestamp for 14 days ago
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const cutoffTimestamp = admin.firestore.Timestamp.fromDate(fourteenDaysAgo);

  try {
    // Query leads with status 'NEW', 'WARM', 'HOT'
    const statusesToDecay = ['NEW', 'WARM', 'HOT'];
    const snapshot = await db.collection("leads")
      .where("status", "in", statusesToDecay)
      .get();

    if (snapshot.empty) {
      logger.info("No leads found matching statuses.");
      return;
    }

    const batch = db.batch();
    let updatedCount = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const lastActivity = data.updatedAt || data.createdAt;

      // If there's no last activity recorded, or it's older than 14 days
      if (!lastActivity || lastActivity.toMillis() < cutoffTimestamp.toMillis()) {
        batch.update(doc.ref, {
          status: "COLD",
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
      logger.info(`Successfully decayed ${updatedCount} leads to COLD status.`);
    } else {
      logger.info("No leads required decay based on timestamp.");
    }

  } catch (error) {
    logger.error("Error processing lead decay:", error);
  }
});
