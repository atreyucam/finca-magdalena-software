// frontend/src/hooks/useDashboard.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { reporteDashboard } from "../api/apiClient";

export default function useDashboard(filtros) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // para que el callback no cambie por referencia a cada render
  const filtrosStable = useMemo(() => filtros || {}, [filtros]);

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reporteDashboard(filtrosStable);
      setData(res ?? null);
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudieron cargar los indicadores.");
    } finally {
      setLoading(false);
    }
  }, [filtrosStable]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { data, loading, error, recargar };
}
