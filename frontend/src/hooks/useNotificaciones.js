import { useEffect, useState } from "react";
import {
  listarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
} from "../api/apiClient";

export default function useNotificaciones() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const [meta, setMeta] = useState({
    total: 0,
    noLeidas: 0,
    hasMore: false,
    nextOffset: 0,
  });

  // 🔹 Carga inicial
  async function cargarInicial() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await listarNotificaciones({
        limit: 20,
        offset: 0,
      });
      setItems(data.items || []);
      setMeta({
        total: data.total || 0,
        noLeidas: data.noLeidas || 0,
        hasMore: !!data.hasMore,
        nextOffset: data.nextOffset || 0,
      });
    } catch (e) {
      console.error("Error cargando notificaciones", e);
      setError("No se pudieron cargar las notificaciones");
    } finally {
      setLoading(false);
    }
  }

  // 🔹 Cargar más (append)
  async function cargarMas() {
    if (!meta.hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const { data } = await listarNotificaciones({
        limit: 20,
        offset: meta.nextOffset,
      });

      setItems((prev) => [...prev, ...(data.items || [])]);
      setMeta((prev) => ({
        total: data.total ?? prev.total,
        noLeidas: data.noLeidas ?? prev.noLeidas,
        hasMore: !!data.hasMore,
        nextOffset: data.nextOffset ?? prev.nextOffset,
      }));
    } catch (e) {
      console.error("Error cargando más notificaciones", e);
    } finally {
      setLoadingMore(false);
    }
  }

  // 🔹 Marcar una como leída
  async function marcarLeida(id) {
    try {
      await marcarNotificacionLeida(id);
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
      );
      setMeta((prev) => ({
        ...prev,
        noLeidas: Math.max(0, prev.noLeidas - 1),
      }));
    } catch (e) {
      console.error("Error marcando notificación como leída", e);
    }
  }

  // 🔹 Marcar todas
  async function marcarTodas() {
    try {
      await marcarTodasNotificacionesLeidas();
      setItems((prev) => prev.map((n) => ({ ...n, leida: true })));
      setMeta((prev) => ({ ...prev, noLeidas: 0 }));
    } catch (e) {
      console.error("Error marcando todas como leídas", e);
    }
  }

  useEffect(() => {
    cargarInicial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    items,
    loading,
    loadingMore,
    error,
    total: meta.total,
    noLeidas: meta.noLeidas,
    hasMore: meta.hasMore,
    cargarInicial,
    cargarMas,
    marcarLeida,
    marcarTodas,
  };
}
