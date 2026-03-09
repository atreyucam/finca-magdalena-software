import { create } from "zustand";
import { toastApi } from "../utils/toastApi";
import { getExp, getSessionClaims, isExpired } from "../utils/jwt";
import api from "../api/apiClient";
import { connectSocket, disconnectSocket, updateSocketToken } from "../lib/socket";
import {
  SESSION_INACTIVITY_MS,
  SESSION_MAX_TOTAL_MS,
} from "../config/sessionPolicy";

let refreshTimerId = null;
const LEGACY_AUTH_KEYS = ["fm_auth_v1", "refreshToken", "refresh_token"];

function clearLegacyAuthStorage() {
  try {
    for (const key of LEGACY_AUTH_KEYS) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  } catch {
    // ignore storage access errors
  }
}

function buildSessionFromToken(token, previousState, fallbackActivityAt = null) {
  const claims = getSessionClaims(token) || {};
  const sessionStartAt =
    claims.sessionStartAt ||
    previousState.sessionStartAt ||
    Date.now();
  const lastActivityAt = Math.max(
    claims.lastActivityAt || 0,
    previousState.lastActivityAt || 0,
    Number.isFinite(Number(fallbackActivityAt)) ? Number(fallbackActivityAt) : 0
  ) || sessionStartAt;

  return {
    sessionStartAt,
    lastActivityAt,
  };
}

function sessionPolicyError(reason) {
  if (reason === "max") {
    return "Se alcanzó el máximo de sesión (8 horas). Inicia sesión nuevamente.";
  }
  return "La sesión expiró por 60 minutos de inactividad. Inicia sesión nuevamente.";
}

function backendSessionErrorMessage(code) {
  if (code === "AUTH_SESSION_EXPIRED_MAX") return sessionPolicyError("max");
  if (code === "AUTH_SESSION_EXPIRED_INACTIVITY") return sessionPolicyError("inactivity");
  if (code === "AUTH_SESSION_INVALID") return "La sesión es inválida. Inicia sesión nuevamente.";
  return "Tu sesión expiró. Inicia sesión nuevamente.";
}

const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  sessionStartAt: null,
  lastActivityAt: null,
  isBootstrapped: false,

  bootstrap: async () => {
    if (get().isBootstrapped) return;
    clearLegacyAuthStorage();

    try {
      await get().refresh();
    } catch {
      // Sin cookie válida -> sesión no restaurada, continúa en estado no autenticado.
    } finally {
      set((s) => ({ ...s, isBootstrapped: true }));
    }
  },

  scheduleProactiveRefresh: () => {
    clearTimeout(refreshTimerId);

    const { accessToken } = get();
    if (!accessToken) return;
    const policy = get().validateSessionWindow();
    if (!policy.ok) {
      get().logout({ localOnly: true, message: policy.message });
      return;
    }

    const expMs = getExp(accessToken);
    if (!expMs) return;

    const delta = Math.max(expMs - Date.now() - 60_000, 5000);

    refreshTimerId = setTimeout(async () => {
      const currentPolicy = get().validateSessionWindow();
      if (!currentPolicy.ok) {
        get().logout({ localOnly: true, message: currentPolicy.message });
        return;
      }

      try {
        await get().refresh();
      } catch (error) {
        const code = error?.response?.data?.code;
        get().logout({
          localOnly: true,
          message: backendSessionErrorMessage(code),
        });
      }
    }, delta);
  },

  login: async (email, password) => {
    clearLegacyAuthStorage();

    const res = await api.post(
      "/auth/login",
      { email, password },
      { skipAuthRefresh: true }
    );

    const { user, access_token, tokens } = res.data || {};
    const access = access_token || tokens?.access || tokens?.accessToken;

    if (!access) throw new Error("Respuesta de login sin access token");

    set((state) => ({
      user,
      accessToken: access,
      ...buildSessionFromToken(access, state, Date.now()),
    }));

    updateSocketToken(access);
    connectSocket();
    get().scheduleProactiveRefresh();

    return user;
  },

  logout: (opts = {}) => {
    clearTimeout(refreshTimerId);
    disconnectSocket();

    set({
      user: null,
      accessToken: null,
      sessionStartAt: null,
      lastActivityAt: null,
    });
    clearLegacyAuthStorage();

    if (!opts.localOnly) {
      api.post("/auth/logout", null, { skipAuthRefresh: true, suppressToast: true }).catch(() => {});
    }

    if (!opts.silent) {
      toastApi.info(opts.message || "Sesión cerrada");
    }
  },

  refresh: async (opts = {}) => {
    const res = await api.post("/auth/refresh", null, {
      skipAuthRefresh: true,
      suppressToast: true,
    });

    const { user, access_token, tokens } = res.data || {};
    const access = access_token || tokens?.access || tokens?.accessToken;

    if (!access) throw new Error("Refresh sin access token");

    set((s) => ({
      accessToken: access,
      user: user || s.user,
      ...buildSessionFromToken(access, s, s.lastActivityAt),
    }));

    updateSocketToken(access);
    connectSocket();

    if (!opts.skipSchedule) {
      get().scheduleProactiveRefresh();
    }

    return access;
  },

  setUserFromProfile: (user) => {
    set((s) => ({ ...s, user }));
  },

  markActivity: (timestamp = Date.now()) => {
    const safeTimestamp = Number.isFinite(Number(timestamp))
      ? Math.trunc(Number(timestamp))
      : Date.now();

    set((state) => {
      if (!state.accessToken) return state;
      if (safeTimestamp <= (state.lastActivityAt || 0)) return state;
      return { ...state, lastActivityAt: safeTimestamp };
    });
  },

  getLastActivityHeader: () => {
    const state = get();
    if (!state.accessToken || !state.lastActivityAt) return null;
    return String(state.lastActivityAt);
  },

  validateSessionWindow: (opts = {}) => {
    const now = Number.isFinite(Number(opts.now)) ? Number(opts.now) : Date.now();
    const { accessToken, sessionStartAt, lastActivityAt } = get();

    if (!accessToken) return { ok: true };

    if (sessionStartAt && now - sessionStartAt > SESSION_MAX_TOTAL_MS) {
      return { ok: false, reason: "max", message: sessionPolicyError("max") };
    }

    if (lastActivityAt && now - lastActivityAt > SESSION_INACTIVITY_MS) {
      return {
        ok: false,
        reason: "inactivity",
        message: sessionPolicyError("inactivity"),
      };
    }

    return { ok: true };
  },

  isAuthenticated: () => {
    const { accessToken } = get();
    if (!accessToken || isExpired(accessToken, 5000)) return false;
    return get().validateSessionWindow().ok;
  },

  getRole: () =>
    get().user?.role ||
    get().user?.rol ||
    get().user?.Role?.nombre ||
    null,
}));

export default useAuthStore;
