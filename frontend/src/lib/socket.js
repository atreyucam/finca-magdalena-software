// src/lib/socket.js
import { io } from "socket.io-client";
import useAuthStore from "../store/authStore";

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

let socket = null;

export function getSocket() {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ["websocket"],
    auth: (cb) => {
      const { accessToken } = useAuthStore.getState();
      cb({ token: accessToken || null });
    },
  });

  socket.on("connect", () => console.log("🔌 Socket conectado:", socket.id));
  socket.on("disconnect", (r) => console.log("🔌 Socket desconectado:", r));
  socket.on("connect_error", (e) => console.warn("🔴 Socket connect_error:", e.message));
  socket.on("auth:forceLogout", (payload) => {
    console.warn("⚠️ Force logout:", payload);
    useAuthStore.getState().logout({ silent: true });
  });

  return socket;
}

export function connectSocket() {
  const s = getSocket();
  const { accessToken } = useAuthStore.getState();
  if (!accessToken) return;
  if (!s.connected) s.connect();
}

export function disconnectSocket() {
  if (!socket) return;
  socket.disconnect();
}
export function updateSocketToken(newToken) {
  const s = getSocket();
  s.auth = (cb) => cb({ token: newToken || null });
  // si quieres forzar re-auth en caliente:
  if (s.connected) {
    s.disconnect();
    s.connect();
  }
}
