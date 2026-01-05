import { create } from "zustand";
import {
  listarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
} from "../api/apiClient";

const PAGE_SIZE = 20;

const useNotificacionesStore = create((set, get) => ({
  items: [],
  loading: false,
  loadingMore: false,
  error: null,
  initialized: false,
  meta: {
    total: 0,
    noLeidas: 0,
    hasMore: false,
    nextOffset: 0,
  },

  cargar: async () => {
    const { loading, initialized } = get();
    if (loading) return;

     if (!initialized) set({ initialized: true });

    set({ loading: true, error: null });

    try {
      const { data } = await listarNotificaciones({ limit: PAGE_SIZE, offset: 0 });

      set({
        items: data.items || [],
        loading: false, 
        error: null,
        meta: {
          total: data.total || 0,
          noLeidas: data.noLeidas || 0,
          hasMore: !!data.hasMore,
          nextOffset: data.nextOffset || 0,
        },
      });
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
      await marcarNotificacionLeida(id);
      set((s) => ({
        items: s.items.map((n) => (n.id === id ? { ...n, leida: true } : n)),
        meta: { ...s.meta, noLeidas: Math.max(0, s.meta.noLeidas - 1) },
      }));
    } catch (e) {
      console.error("Error marcando notificación como leída", e);
    }
  },

  marcarTodas: async () => {
    try {
      await marcarTodasNotificacionesLeidas();
      set((s) => ({
        items: s.items.map((n) => ({ ...n, leida: true })),
        meta: { ...s.meta, noLeidas: 0 },
      }));
    } catch (e) {
      console.error("Error marcando todas como leídas", e);
    }
  },
}));

export default useNotificacionesStore;
