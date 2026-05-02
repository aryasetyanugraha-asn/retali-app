import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const setCustomUserClaims = onCall({ region: "asia-southeast2", cors: true }, async (request) => {
  // Ensure the user is authenticated
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Only authenticated users can set custom claims."
    );
  }

  // Ensure the user has the 'PUSAT' role (Admin)
  // Check the caller's claims first, otherwise fallback to database role if not yet claimed
  const callerUid = request.auth.uid;
  let isPusat = request.auth.token.role === "PUSAT";

  if (!isPusat) {
    // Fallback check in the database
    const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
    if (callerDoc.exists && callerDoc.data()?.role === "PUSAT") {
      isPusat = true;
    }
  }

  if (!isPusat) {
    throw new HttpsError(
      "permission-denied",
      "Only users with the PUSAT role can assign custom claims."
    );
  }

  const { uid, role, branchId, partnerId } = request.data;

  if (!uid || !role) {
    throw new HttpsError(
      "invalid-argument",
      "The 'uid' and 'role' fields are required."
    );
  }

  if (!["PUSAT", "CABANG", "MITRA"].includes(role)) {
    throw new HttpsError(
      "invalid-argument",
      "The 'role' must be one of: PUSAT, CABANG, MITRA."
    );
  }

  // Prepare custom claims object
  const customClaims: { role: string; branchId?: string; partnerId?: string } = {
    role,
  };

  if (branchId) {
    customClaims.branchId = branchId;
  }

  if (partnerId) {
    customClaims.partnerId = partnerId;
  }

  try {
    // Set custom user claims via Firebase Admin SDK
    await admin.auth().setCustomUserClaims(uid, customClaims);

    // Also update the role in the user document to keep it in sync
    await admin.firestore().collection("users").doc(uid).set(
      { role, branchId, partnerId: partnerId || uid },
      { merge: true }
    );

    return {
      success: true,
      message: `Custom claims successfully set for user ${uid}.`,
    };
  } catch (error) {
    console.error("Error setting custom claims:", error);
    throw new HttpsError(
      "internal",
      "An error occurred while setting custom claims."
    );
  }
});
