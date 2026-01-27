import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// Import Services
import { generateContent } from "./services/aiService";
// import { postToSocial } from "./services/socialService";

// Export Functions
export const generateAIContent = functions.https.onCall(generateContent);

// Example HTTP Trigger
export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase Backend!");
});

// Triggers
export const onUserCreated = functions.auth.user().onCreate((user) => {
    // Logic to set default custom claims or create user profile in Firestore
    const db = admin.firestore();
    return db.collection("users").doc(user.uid).set({
        email: user.email,
        role: "MITRA", // Default role
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
});
