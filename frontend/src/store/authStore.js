import { create } from "zustand";
import { toastApi } from "../utils/toastApi";

import { getExp, isExpired } from "../utils/jwt";
import api from "../api/apiClient";

const STORAGE_KEY = "fm_auth_v1";

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { user: null, accessToken: null, refreshToken: null };
  } catch {
    return { user: null, accessToken: null, refreshToken: null };
  }
}

function persist(state) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ user: state.user, accessToken: state.accessToken, refreshToken: state.refreshToken })
  );
}

let refreshTimerId = null;

const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isBootstrapped: false,

  bootstrap: async () => {
    const persisted = loadPersisted();
    set({ ...persisted, isBootstrapped: true });
    // programar refresh proactivo si aplica
    get().scheduleProactiveRefresh();
  },

  scheduleProactiveRefresh: () => {
    clearTimeout(refreshTimerId);
    const { accessToken } = get();
    if (!accessToken) return;

    const expMs = getExp(accessToken);
    if (!expMs) return;

    // refrescar 60s antes de expirar (mínimo 5s desde ahora)
    const delta = Math.max(expMs - Date.now() - 60_000, 5000);
    refreshTimerId = setTimeout(async () => {
      try {
        await get().refresh();
      } catch {
        // si falla, el interceptor lo gestionará al siguiente 401
      } finally {
        get().scheduleProactiveRefresh();
      }
    }, delta);
  },

login: async (email, password) => {
  const res = await api.post("/auth/login", { email, password });
  const { user, access_token, refresh_token, tokens } = res.data || {};

  const access = access_token || tokens?.access || tokens?.accessToken;
  const refresh = refresh_token || tokens?.refresh || tokens?.refreshToken;

  if (!access) throw new Error("Respuesta de login sin access token");

  set({ user, accessToken: access, refreshToken: refresh || null });
  persist(get());
  get().scheduleProactiveRefresh();
  // toastApi.success(`Bienvenido, ${user?.nombres || user?.name || "usuario"}`);
  return user;
},

  logout: () => {
    clearTimeout(refreshTimerId);
    set({ user: null, accessToken: null, refreshToken: null });
    localStorage.removeItem(STORAGE_KEY);
    toastApi.info("Sesión cerrada");
  },

 refresh: async () => {
  const { refreshToken } = get();
  if (!refreshToken) throw new Error("No hay refresh_token");
  const res = await api.post("/auth/refresh", { refresh_token: refreshToken });
  const { access_token, refresh_token, tokens } = res.data || {};

  const access = access_token || tokens?.access || tokens?.accessToken;
  const refresh = refresh_token || tokens?.refresh || tokens?.refreshToken;

  if (!access) throw new Error("Refresh sin access token");
  set((s) => ({
    ...s,
    accessToken: access || s.accessToken,
    refreshToken: refresh ?? s.refreshToken,
  }));
  persist(get());
  return get().accessToken;
},

  setUserFromProfile: (user) => {
    set((s) => ({ ...s, user }));
    persist(get());
  },

  isAuthenticated: () => {
    const { accessToken } = get();
    return !!accessToken && !isExpired(accessToken, 5000);
  },

  getRole: () => get().user?.role || get().user?.rol || get().user?.Role || null,
}));

export default useAuthStore;
