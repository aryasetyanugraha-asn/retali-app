import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

admin.initializeApp();

// Import Services
import { generateAIContent } from "./services/aiService";
import { postToSocial as postToSocialService } from "./services/socialService";
import { exchangeTikTokToken as exchangeTikTokTokenService } from "./services/integrationService";

// Import Controllers
import { webhookHandler } from "./controllers/webhookController";

// Import Triggers
import { onCreateUser } from "./triggers/authTriggers";
import { processScheduledPosts as processScheduledPostsService } from "./triggers/schedule";

// Export Functions

// AI Service (v2)
export const generateContent = generateAIContent;

// Social Media Service (v1)
export const postToSocial = functions.https.onCall(postToSocialService);

// Integration Service (v2)
export const exchangeTikTokToken = exchangeTikTokTokenService;

// Webhooks
export const metaWebhook = webhookHandler;

// Auth Triggers
export const onUserCreated = onCreateUser;

// Scheduled Posts
export const processScheduledPosts = processScheduledPostsService;

// Example HTTP Trigger
export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase Backend!");
});
