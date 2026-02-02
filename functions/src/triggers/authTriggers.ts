import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const onCreateUser = functions.auth.user().onCreate(async (user) => {
    const db = admin.firestore();
    return db.collection("users").doc(user.uid).set({
        email: user.email,
        role: "MITRA", // Default role
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
});
