import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import axios from "axios";

export const exchangeTikTokToken = onCall({
  cors: true,
  region: "asia-southeast2",
  timeoutSeconds: 60,
  memory: "256MiB"
}, async (request) => {
  // 1. Validate Authentication
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be logged in to exchange TikTok token."
    );
  }

  const { code, redirect_uri, code_verifier } = request.data;

  if (!code || !redirect_uri || !code_verifier) {
    throw new HttpsError(
      "invalid-argument",
      "Missing code, redirect_uri, or code_verifier."
    );
  }

  // Get TikTok credentials from environment variables
  // In Firebase v2, we should use process.env
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    logger.error("TikTok credentials not configured.");
    throw new HttpsError(
      "failed-precondition",
      "TikTok integration is not fully configured on the server."
    );
  }

  try {
    const url = "https://open.tiktokapis.com/v2/oauth/token/";
    const data = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code: code,
      grant_type: "authorization_code",
      redirect_uri: redirect_uri,
      code_verifier: code_verifier,
    });

    const response = await axios.post(url, data.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
    });

    const tokenData = response.data;

    // Check for error in response
    if (tokenData.error) {
       logger.error("TikTok token exchange error response:", tokenData);
       throw new HttpsError("internal", `TikTok Error: ${tokenData.error_description || tokenData.error}`);
    }

    const { access_token, refresh_token, open_id, expires_in, refresh_expires_in } = tokenData;

    // Save to Firestore
    const uid = request.auth.uid;
    const integrationRef = admin.firestore().doc(`users/${uid}/integrations/tiktok`);

    await integrationRef.set({
      platform: "tiktok",
      access_token,
      refresh_token,
      open_id,
      expires_in,
      refresh_expires_in,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      // We also store raw response for debugging/completeness if needed
      raw_data: tokenData,
    }, { merge: true });

    logger.info(`Successfully exchanged TikTok token for user ${uid}`);

    return {
      success: true,
      message: "TikTok connected successfully."
    };

  } catch (error: any) {
    logger.error("Error exchanging TikTok token:", error.response?.data || error.message);
    throw new HttpsError("internal", "Failed to exchange TikTok token.");
  }
});

export const exchangeMetaToken = onCall({
  cors: true,
  region: "asia-southeast2",
  timeoutSeconds: 60,
  memory: "256MiB"
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const { shortLivedToken, responseData } = request.data;
  if (!shortLivedToken) {
    throw new HttpsError("invalid-argument", "Missing shortLivedToken.");
  }

  const appId = process.env.VITE_FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    logger.error("Facebook App ID or Secret missing");
    throw new HttpsError("failed-precondition", "Meta integration is not fully configured on the server.");
  }

  try {
    const url = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
    const response = await axios.get(url);
    const longLivedToken = response.data.access_token;

    const uid = request.auth.uid;
    const db = admin.firestore();

    const docData = {
      ...responseData,
      accessToken: longLivedToken,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.doc(`users/${uid}/integrations/facebook`).set({ ...docData, platform: 'facebook' }, { merge: true });
    await db.doc(`users/${uid}/integrations/instagram`).set({ ...docData, platform: 'instagram' }, { merge: true });

    return { success: true, message: "Meta token exchanged successfully" };
  } catch (error: any) {
    logger.error("Error exchanging Meta token:", error.response?.data || error.message);
    throw new HttpsError("internal", "Failed to exchange Meta token.");
  }
});
