import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getMessaging, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "beacon-477817",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
};

let app: FirebaseApp;
export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return app;
}

let messagingInstance: Messaging | null = null;
export function getFirebaseMessaging(): Messaging | null {
  if (typeof window === "undefined") return null;
  if (!("Notification" in window)) return null;
  try {
    if (!messagingInstance) {
      messagingInstance = getMessaging(getFirebaseApp());
    }
    return messagingInstance;
  } catch {
    return null;
  }
}
