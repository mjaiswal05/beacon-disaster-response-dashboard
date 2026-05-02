import { useCallback, useEffect, useRef, useState } from "react";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_DURATION_MS = 5 * 60 * 1000; // 5 minutes warning before auto-logout

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;

interface UseSessionTimeoutReturn {
  showWarning: boolean;
  secondsRemaining: number;
  resetTimeout: () => void;
}

export function useSessionTimeout(onLogout: () => void): UseSessionTimeoutReturn {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(
    Math.floor(WARNING_DURATION_MS / 1000),
  );

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
  }, []);

  const startCountdown = useCallback(() => {
    setSecondsRemaining(Math.floor(WARNING_DURATION_MS / 1000));
    setShowWarning(true);

    countdownInterval.current = setInterval(() => {
      setSecondsRemaining((s) => Math.max(0, s - 1));
    }, 1000);

    logoutTimer.current = setTimeout(() => {
      clearAllTimers();
      onLogout();
    }, WARNING_DURATION_MS);
  }, [clearAllTimers, onLogout]);

  const resetTimeout = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    setSecondsRemaining(Math.floor(WARNING_DURATION_MS / 1000));

    idleTimer.current = setTimeout(startCountdown, IDLE_TIMEOUT_MS);
  }, [clearAllTimers, startCountdown]);

  useEffect(() => {
    // Start the idle timer on mount
    resetTimeout();

    const handleActivity = () => {
      // Only reset if warning is not showing - user must explicitly dismiss warning
      if (!showWarning) resetTimeout();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      clearAllTimers();
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount/unmount

  return { showWarning, secondsRemaining, resetTimeout };
}
