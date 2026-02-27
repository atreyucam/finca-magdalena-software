import { io } from "socket.io-client";
import useAuthStore from "../store/authStore";

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const MAX_AUTH_RECOVERY_ATTEMPTS = 1;

let socketSingleton = null;
let authRecoveryInFlight = false;
let authRecoveryAttempts = 0;
let resetAuthRecoveryTimerId = null;
let unsubscribeAuthStore = null;

function getCurrentToken() {
  return useAuthStore.getState().accessToken || null;
}

function isUnauthorizedSocketError(error) {
  const msg = String(error?.message || "").toUpperCase();
  return msg.includes("UNAUTHORIZED") || msg.includes("AUTH");
}

function resetAuthRecoveryAttemptsLater() {
  if (resetAuthRecoveryTimerId) clearTimeout(resetAuthRecoveryTimerId);
  resetAuthRecoveryTimerId = setTimeout(() => {
    authRecoveryAttempts = 0;
    resetAuthRecoveryTimerId = null;
  }, 5000);
}

function applySocketToken(token) {
  if (!socketSingleton) return;
  socketSingleton.auth = { token: token || null };
}

async function recoverSocketAuthOnce() {
  if (authRecoveryInFlight || authRecoveryAttempts >= MAX_AUTH_RECOVERY_ATTEMPTS) {
    return;
  }

  authRecoveryInFlight = true;
  authRecoveryAttempts += 1;

  try {
    const newToken = await useAuthStore.getState().refresh({ skipSchedule: true });
    applySocketToken(newToken);
    if (socketSingleton && !socketSingleton.connected) {
      socketSingleton.connect();
    }
  } catch {
    // Si refresh falla, evitamos loops y esperamos siguiente cambio de token (login/refresh externo).
    resetAuthRecoveryAttemptsLater();
  } finally {
    authRecoveryInFlight = false;
  }
}

function ensureAuthStoreSync() {
  if (unsubscribeAuthStore) return;

  unsubscribeAuthStore = useAuthStore.subscribe((state, prevState) => {
    const nextToken = state?.accessToken || null;
    const prevToken = prevState?.accessToken || null;

    if (nextToken === prevToken) return;

    applySocketToken(nextToken);

    if (!socketSingleton) return;

    if (!nextToken) {
      if (socketSingleton.connected) socketSingleton.disconnect();
      return;
    }

    if (!socketSingleton.connected) {
      socketSingleton.connect();
    }
  });
}

function attachSocketLifecycleHandlers(socket) {
  socket.on("connect", () => {
    authRecoveryAttempts = 0;
    if (resetAuthRecoveryTimerId) {
      clearTimeout(resetAuthRecoveryTimerId);
      resetAuthRecoveryTimerId = null;
    }
  });

  socket.on("connect_error", async (error) => {
    if (!isUnauthorizedSocketError(error)) return;

    socket.disconnect();
    await recoverSocketAuthOnce();
  });

  socket.on("auth:forceLogout", () => {
    useAuthStore.getState().logout({
      silent: false,
      message: "Tu sesión expiró. Inicia sesión nuevamente.",
    });
  });
}

export function createSocket(token) {
  return io(SOCKET_URL, {
    autoConnect: false,
    withCredentials: true,
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    auth: { token: token || null },
  });
}

export function getSocket() {
  if (!socketSingleton) {
    socketSingleton = createSocket(getCurrentToken());
    attachSocketLifecycleHandlers(socketSingleton);
    ensureAuthStoreSync();
  }
  return socketSingleton;
}

export function connectSocket() {
  const token = getCurrentToken();
  if (!token) return;

  const socket = getSocket();
  applySocketToken(token);

  if (!socket.connected) {
    socket.connect();
  }
}

export function disconnectSocket() {
  if (!socketSingleton) return;
  socketSingleton.disconnect();
}

export function updateSocketToken(newToken, { reconnectIfConnected = true } = {}) {
  const socket = getSocket();
  applySocketToken(newToken);

  if (!newToken) {
    if (socket.connected) socket.disconnect();
    return;
  }

  if (socket.connected && reconnectIfConnected) {
    socket.disconnect();
    socket.connect();
    return;
  }

  if (!socket.connected) socket.connect();
}
