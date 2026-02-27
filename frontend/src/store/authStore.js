import { create } from "zustand";
import { toastApi } from "../utils/toastApi";
import { getExp, isExpired } from "../utils/jwt";
import api from "../api/apiClient";
import { connectSocket, disconnectSocket, updateSocketToken } from "../lib/socket";

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

const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
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

    const expMs = getExp(accessToken);
    if (!expMs) return;

    const delta = Math.max(expMs - Date.now() - 60_000, 5000);

    refreshTimerId = setTimeout(async () => {
      try {
        await get().refresh();
      } catch {
        get().logout({ silent: true });
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

    set({ user, accessToken: access });

    updateSocketToken(access);
    connectSocket();
    get().scheduleProactiveRefresh();

    return user;
  },

  logout: (opts = {}) => {
    clearTimeout(refreshTimerId);
    disconnectSocket();

    set({ user: null, accessToken: null });
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
      ...s,
      accessToken: access,
      user: user || s.user,
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

  isAuthenticated: () => {
    const { accessToken } = get();
    return !!accessToken && !isExpired(accessToken, 5000);
  },

  getRole: () =>
    get().user?.role ||
    get().user?.rol ||
    get().user?.Role?.nombre ||
    null,
}));

export default useAuthStore;
