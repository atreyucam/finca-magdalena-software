// src/hooks/useNotificaciones.js
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
    initialized,
    cargar,
    cargarMas,
    marcarLeida,
    marcarTodas,
    bindSocket, // ✅
  } = useNotificacionesStore(
    useShallow((s) => ({
      items: s.items,
      loading: s.loading,
      loadingMore: s.loadingMore,
      error: s.error,
      meta: s.meta,
      initialized: s.initialized,
      cargar: s.cargar,
      cargarMas: s.cargarMas,
      marcarLeida: s.marcarLeida,
      marcarTodas: s.marcarTodas,
      bindSocket: s.bindSocket,
    }))
  );

  useEffect(() => {
    bindSocket(); // ✅ activa tiempo real
  }, [bindSocket]);

  useEffect(() => {
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
