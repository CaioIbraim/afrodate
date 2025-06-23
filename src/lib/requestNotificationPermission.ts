// requestNotificationPermission.ts
import { getToken, messaging } from "./firebase";

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      return;
    }

    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    if (!registration) {
      return;
    }

    const token = await getToken(messaging!, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      return;
    }

    // Save the Token to a Database here if you need

  } catch (error) {
    console.error("Error Requesting Notification Permission:", error);
    return;
  }
};
