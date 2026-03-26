/**
 * Script to bootstrap the first Admin (PUSAT role) user.
 *
 * Instructions:
 * 1. Go to Firebase Console -> Project Settings -> Service Accounts.
 * 2. Click "Generate new private key" and save the JSON file to `functions/serviceAccountKey.json`.
 * 3. Make sure you don't commit `serviceAccountKey.json` to version control (it's usually in .gitignore).
 * 4. Run this script using Node.js, passing your UID as an argument.
 *
 * Example:
 * cd functions
 * node makeAdmin.js YOUR_USER_UID
 */

const admin = require('firebase-admin');

// Ensure the UID is provided
const uid = process.argv[2];
if (!uid) {
  console.error("Please provide a UID as an argument.");
  console.error("Usage: node makeAdmin.js <YOUR_UID>");
  process.exit(1);
}

// Load the service account key
let serviceAccount;
try {
  serviceAccount = require('./serviceAccountKey.json');
} catch (error) {
  console.error("Error: Could not find 'serviceAccountKey.json'.");
  console.error("Please download it from Firebase Console -> Project Settings -> Service Accounts and place it in the 'functions' directory.");
  process.exit(1);
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function makeAdmin() {
  try {
    // 1. Set Custom User Claims
    await admin.auth().setCustomUserClaims(uid, { role: 'PUSAT' });
    console.log(`Successfully set 'PUSAT' custom claim for user: ${uid}`);

    // 2. Update the user document in Firestore to keep it in sync
    await admin.firestore().collection('users').doc(uid).set({
      role: 'PUSAT',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`Successfully updated 'users' collection document for user: ${uid}`);

    console.log("\nSuccess! You are now an Admin.");
    console.log("Please log out and log back into the app to refresh your token claims.");
  } catch (error) {
    console.error("Error making user admin:", error);
  } finally {
    // Exit the script
    process.exit(0);
  }
}

makeAdmin();
