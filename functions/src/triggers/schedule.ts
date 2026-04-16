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

    const promises: Promise<void>[] = [];

    for (const doc of postsSnapshot.docs) {
      const postData = doc.data();

      // Process each post asynchronously and update its status immediately
      const processPromise = processScheduledPost(doc.id, postData, db).then(async (success) => {
        if (success) {
          logger.info(`Post ${doc.id} processed successfully.`);
          await doc.ref.update({
            status: "PUBLISHED",
            publishedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          logger.error(`Post ${doc.id} failed to process.`);
          await doc.ref.update({
            status: "FAILED",
            failedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }).catch(async (error) => {
        logger.error(`Unexpected error processing post ${doc.id}:`, error);
        await doc.ref.update({
          status: "FAILED",
          error: error.message || "Unknown error",
          failedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      promises.push(processPromise);
    }

    // Wait for all posts to be processed and updated
    await Promise.all(promises);
    logger.info("Finished processing scheduled posts and updating statuses.");
  } catch (error) {
    logger.error("Error querying or processing scheduled posts:", error);
  }
});
