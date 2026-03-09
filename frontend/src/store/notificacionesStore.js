// src/store/notificacionesStore.js
import { create } from "zustand";
import {
  listarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
} from "../api/apiClient";
import { getSocket, connectSocket } from "../lib/socket";

const PAGE_SIZE = 20;

const baseState = {
  items: [],
  loading: false,
  loadingMore: false,
  error: null,
  initialized: false,
  socketBound: false,
  socketHandlers: null,
  meta: {
    total: 0,
    noLeidas: 0,
    hasMore: false,
    nextOffset: 0,
  },
};

const normalizeNotifId = (id) => String(id ?? "");

const useNotificacionesStore = create((set, get) => ({
  ...baseState,

  bindSocket: () => {
    const { socketBound } = get();
    if (socketBound) return;

    connectSocket();
    const s = getSocket();

    const onNueva = (notif) => {
      if (!notif?.id) return;

      set((st) => {
        const exists = st.items.some(
          (x) => normalizeNotifId(x.id) === normalizeNotifId(notif.id)
        );
        const items = exists ? st.items : [notif, ...st.items];
        const isUnread = notif.leida !== true;

        return {
          items,
          meta: {
            ...st.meta,
            total: (st.meta.total || 0) + (exists ? 0 : 1),
            noLeidas:
              (st.meta.noLeidas || 0) + (!exists && isUnread ? 1 : 0),
          },
        };
      });
    };

    const onConnect = () => {
      // Re-sincroniza al reconectar para cubrir eventos perdidos sin polling agresivo.
      get().cargar({ silent: true });
    };

    s.on("notif:nueva", onNueva);
    s.on("connect", onConnect);

    set({
      socketBound: true,
      socketHandlers: { onNueva, onConnect },
    });
  },

  cargar: async ({ silent = false } = {}) => {
    const { loading, loadingMore, initialized } = get();
    if (loading || loadingMore) return;

    if (!initialized) set({ initialized: true });
    if (!silent) set({ loading: true, error: null });
    else set({ error: null });

    try {
      const { data } = await listarNotificaciones({ limit: PAGE_SIZE, offset: 0 });

      set(() => ({
        items: data.items || [],
        loading: false,
        error: null,
        meta: {
          total: data.total || 0,
          noLeidas: data.noLeidas || 0,
          hasMore: !!data.hasMore,
          nextOffset: data.nextOffset || 0,
        },
      }));
    } catch (e) {
      console.error("Error cargando notificaciones", e);
      set({ loading: false, error: "No se pudieron cargar las notificaciones" });
    }
  },

  cargarMas: async () => {
    const { meta, loadingMore } = get();
    if (!meta.hasMore || loadingMore) return;

    set({ loadingMore: true });
    try {
      const { data } = await listarNotificaciones({
        limit: PAGE_SIZE,
        offset: meta.nextOffset,
      });

      set((s) => ({
        items: [...s.items, ...(data.items || [])],
        loadingMore: false,
        meta: {
          total: data.total ?? s.meta.total,
          noLeidas: data.noLeidas ?? s.meta.noLeidas,
          hasMore: !!data.hasMore,
          nextOffset: data.nextOffset ?? s.meta.nextOffset,
        },
      }));
    } catch (e) {
      console.error("Error cargando más notificaciones", e);
      set({ loadingMore: false });
    }
  },

  marcarLeida: async (id) => {
    try {
      const { data } = await marcarNotificacionLeida(id);
      set((s) => ({
        items: s.items.map((n) =>
          normalizeNotifId(n.id) === normalizeNotifId(id)
            ? { ...n, leida: true, read_at: data?.read_at || n.read_at }
            : n
        ),
        meta: { ...s.meta, noLeidas: Math.max(0, s.meta.noLeidas - 1) },
      }));
    } catch (e) {
      console.error("Error marcando notificación como leída", e);
    }
  },

  marcarTodas: async () => {
    try {
      await marcarTodasNotificacionesLeidas();
      const readAt = new Date().toISOString();
      set((s) => ({
        items: s.items.map((n) => ({ ...n, leida: true, read_at: n.read_at || readAt })),
        meta: { ...s.meta, noLeidas: 0 },
      }));
    } catch (e) {
      console.error("Error marcando todas como leídas", e);
    } 
  },

  reset: () => {
    const { socketBound, socketHandlers } = get();
    if (socketBound && socketHandlers) {
      const s = getSocket();
      s.off("notif:nueva", socketHandlers.onNueva);
      s.off("connect", socketHandlers.onConnect);
    }

    set({ ...baseState });
  },
}));

export default useNotificacionesStore;
