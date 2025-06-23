// firebaseAdmin.ts
import admin from "firebase-admin";
import settings from "./oraculo-80a0b-firebase-adminsdk-fbsvc-6918f33d64.json"; // Replace with your actual settings file path



const serviceAccount = settings as admin.ServiceAccount;

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin Initialized Successfully");
  } catch (error) {
    console.error("Firebase Admin Initialization Failed:", error);
  }
}

export default admin;
