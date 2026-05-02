import * as admin from "firebase-admin";

admin.initializeApp();

// Import Services
import { generateAIContent, generateAiReply as generateAiReplyService } from "./services/aiService";
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
import { autoScoreLeadOnMessage as autoScoreLeadOnMessageService } from "./triggers/messageTriggers";

import { scheduledDataCrawler as scheduledDataCrawlerService } from "./triggers/crawlerCron";
import { manualDataCrawl as manualDataCrawlService } from "./triggers/crawlerManual";
import { processLeadDecay as processLeadDecayService } from "./triggers/leadDecay";

// Export Functions

// User Service (Custom Claims)
export const setCustomUserClaims = setCustomUserClaimsService;

// AI Service (v2)
export const generateContent = generateAIContent;
export const generateAiReply = generateAiReplyService;
import { generateCampaignOptions as generateCampaignOptionsService, generateMonthBreakdown as generateMonthBreakdownService } from "./services/aiService";
export const generateCampaignOptions = generateCampaignOptionsService;
export const generateMonthBreakdown = generateMonthBreakdownService;

// Social Media Service (v2)
export const postToSocial = postToSocialService;
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
export const autoScoreLeadOnMessage = autoScoreLeadOnMessageService;

// Auth Triggers
export const onUserCreated = onCreateUser;

// Scheduled Posts
export const processScheduledPosts = processScheduledPostsService;

// Scheduled Lead Decay
export const processLeadDecay = processLeadDecayService;

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// Example HTTP Trigger
export const helloWorld = onRequest({ region: "asia-southeast2" }, (request, response) => {
  logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase Backend!");
});

// Data Crawler
export const scheduledDataCrawler = scheduledDataCrawlerService;
export const manualDataCrawl = manualDataCrawlService;
