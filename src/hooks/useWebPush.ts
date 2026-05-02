import { getToken, onMessage } from "firebase/messaging";
import { useEffect } from "react";
import { getFirebaseMessaging } from "../lib/firebase";
import { request } from "../utils/request";

export function useWebPush(userId: string | undefined): void {
  useEffect(() => {
    if (!userId) return;
    if (!("serviceWorker" in navigator)) return;
    if (!("Notification" in window)) return;

    let cancelled = false;

    async function init() {
      try {
        // Register service worker
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted" || cancelled) return;

        const messaging = getFirebaseMessaging();
        if (!messaging) return;

        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

        const token = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: registration,
        });

        if (!token || cancelled) return;

        // Register FCM token with IAM device endpoint (best-effort)
        await request.post(`/api/iam/v1/users/${userId}/devices`, {
          token,
          platform: "web",
          device_name: navigator.userAgent.slice(0, 200),
        }).catch(() => {/* best-effort */ });

        // Handle foreground messages (background is handled by sw.js)
        onMessage(messaging, (payload) => {
          if (cancelled) return;
          const title = payload.notification?.title ?? payload.data?.["title"] ?? "Beacon";
          const body = payload.notification?.body ?? payload.data?.["body"] ?? "";
          // Show native notification if not focused
          if (document.hidden && Notification.permission === "granted") {
            new Notification(title, {
              body,
              icon: "/beacon.png",
            });
          }
        });
      } catch (err) {
        console.warn("[useWebPush]", err);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [userId]);
}
