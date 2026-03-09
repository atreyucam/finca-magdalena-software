import { useEffect } from "react";
import useAuthStore from "../store/authStore";

const ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "touchstart",
  "wheel",
  "scroll",
];

const ACTIVITY_THROTTLE_MS = 15_000;
const WATCHDOG_INTERVAL_MS = 30_000;

export default function useSessionActivity() {
  useEffect(() => {
    let lastMark = 0;

    const markActivity = () => {
      const now = Date.now();
      if (now - lastMark < ACTIVITY_THROTTLE_MS) return;
      lastMark = now;
      useAuthStore.getState().markActivity(now);
    };

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, markActivity, { passive: true });
    }

    const intervalId = window.setInterval(() => {
      const state = useAuthStore.getState();
      const validation = state.validateSessionWindow({ now: Date.now() });
      if (!validation.ok) {
        state.logout({ localOnly: true, message: validation.message });
      }
    }, WATCHDOG_INTERVAL_MS);

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, markActivity);
      }
      window.clearInterval(intervalId);
    };
  }, []);
}

