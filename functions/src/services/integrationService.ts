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
