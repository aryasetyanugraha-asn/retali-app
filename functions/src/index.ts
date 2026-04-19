import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

admin.initializeApp();

// Import Services
import { generateAIContent } from "./services/aiService";
import { postToSocial as postToSocialService, replyToMetaMessage as replyToMetaMessageService } from "./services/socialService";
import { exchangeTikTokToken as exchangeTikTokTokenService, exchangeMetaToken as exchangeMetaTokenService } from "./services/integrationService";
import { setCustomUserClaims as setCustomUserClaimsService } from "./services/userService";
import { sendWhatsAppMessage as sendWhatsAppMessageService } from "./services/whatsappService";

// Import Triggers
import { onCreateUser } from "./triggers/authTriggers";
import { processScheduledPosts as processScheduledPostsService } from "./triggers/schedule";
import { catchLeadWebhook as catchLeadWebhookService } from "./triggers/webhooks";
import { whatsappWebhook as whatsappWebhookService } from "./triggers/whatsapp";
import { metaSocialWebhook as metaSocialWebhookService } from "./triggers/metaSocialWebhook";

import { scheduledDataCrawler as scheduledDataCrawlerService } from "./triggers/crawlerCron";
import { manualDataCrawl as manualDataCrawlService } from "./triggers/crawlerManual";

// Export Functions

// User Service (Custom Claims)
export const setCustomUserClaims = setCustomUserClaimsService;

// AI Service (v2)
export const generateContent = generateAIContent;

// Social Media Service (v1)
export const postToSocial = functions.https.onCall(postToSocialService);

// Social Media Service (v2)
export const replyToMetaMessage = replyToMetaMessageService;

// WhatsApp Service (v2)
export const sendWhatsAppMessage = sendWhatsAppMessageService;

// Integration Service (v2)
export const exchangeTikTokToken = exchangeTikTokTokenService;
export const exchangeMetaToken = exchangeMetaTokenService;

// Webhooks (v2)
export const catchLeadWebhook = catchLeadWebhookService;
export const whatsappWebhook = whatsappWebhookService;
export const metaSocialWebhook = metaSocialWebhookService;

// Auth Triggers
export const onUserCreated = onCreateUser;

// Scheduled Posts
export const processScheduledPosts = processScheduledPostsService;

// Example HTTP Trigger
export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase Backend!");
});

// Data Crawler
export const scheduledDataCrawler = scheduledDataCrawlerService;
export const manualDataCrawl = manualDataCrawlService;
