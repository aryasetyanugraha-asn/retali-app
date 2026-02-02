import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// Import Services
import { generateAIContent } from "./services/aiService";
import { postToSocial as postToSocialService } from "./services/socialService";

// Import Controllers
import { webhookHandler } from "./controllers/webhookController";

// Import Triggers
import { onCreateUser } from "./triggers/authTriggers";

// Export Functions

// AI Service
export const generateContent = generateAIContent;

// Social Media Service
export const postToSocial = functions.https.onCall(postToSocialService);

// Webhooks
export const metaWebhook = webhookHandler;

// Auth Triggers
export const onUserCreated = onCreateUser;

// Example HTTP Trigger
export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase Backend!");
});
