import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import useNotificacionesStore from "../store/notificacionesStore";

export default function useNotificaciones() {
  const {
    items,
    loading,
    loadingMore,
    error,
    meta,
    initialized,     // ✅ NUEVO
    cargar,
    cargarMas,
    marcarLeida,
    marcarTodas,
  } = useNotificacionesStore(
    useShallow((s) => ({
      items: s.items,
      loading: s.loading,
      loadingMore: s.loadingMore,
      error: s.error,
      meta: s.meta,
      initialized: s.initialized, // ✅ NUEVO
      cargar: s.cargar,
      cargarMas: s.cargarMas,
      marcarLeida: s.marcarLeida,
      marcarTodas: s.marcarTodas,
    }))
  );

  useEffect(() => {
    // ✅ solo 1 vez (StrictMode en dev lo hará 2, pero ya no spamea)
    if (!initialized && !loading) cargar();
  }, [initialized, loading, cargar]);

  return {
    items,
    loading,
    loadingMore,
    error,
    total: meta.total,
    noLeidas: meta.noLeidas,
    hasMore: meta.hasMore,
    cargar,
    cargarMas,
    marcarLeida,
    marcarTodas,
  };
}
