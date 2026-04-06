import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { processScheduledPost } from "../services/socialService";

export const processScheduledPosts = onSchedule({
  schedule: "every 10 minutes",
  region: "asia-southeast2",
  timeoutSeconds: 300, // 5 minutes
  memory: "512MiB"
}, async (event) => {
  logger.info("Starting scheduled posts processing");

  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  try {
    // Query posts that are scheduled and the time has passed
    const postsSnapshot = await db.collection("scheduledPosts")
      .where("status", "==", "PENDING")
      .where("scheduledAt", "<=", now)
      .get();

    if (postsSnapshot.empty) {
      logger.info("No scheduled posts found to process.");
      return;
    }

    logger.info(`Found ${postsSnapshot.size} posts to process.`);

    const batch = db.batch();
    const promises: Promise<void>[] = [];

    for (const doc of postsSnapshot.docs) {
      const postData = doc.data();

      // Process each post asynchronously
      const processPromise = processScheduledPost(doc.id, postData, db).then((success) => {
        if (success) {
          logger.info(`Post ${doc.id} processed successfully.`);
          batch.update(doc.ref, {
            status: "PUBLISHED",
            publishedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          logger.error(`Post ${doc.id} failed to process.`);
          batch.update(doc.ref, {
            status: "FAILED",
            failedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }).catch((error) => {
        logger.error(`Unexpected error processing post ${doc.id}:`, error);
        batch.update(doc.ref, {
          status: "FAILED",
          error: error.message || "Unknown error",
          failedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      promises.push(processPromise);
    }

    // Wait for all posts to be processed
    await Promise.all(promises);

    // Commit all status updates to Firestore
    await batch.commit();
    logger.info("Finished processing scheduled posts and updating statuses.");
  } catch (error) {
    logger.error("Error querying or processing scheduled posts:", error);
  }
});
