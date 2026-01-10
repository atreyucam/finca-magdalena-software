// frontend/src/hooks/useDashboard.js
import { useCallback, useEffect, useState } from "react";
import { getDashboardIntegral } from "../api/apiClient";

export default function useDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDashboardIntegral(); // sin filtros por ahora
      setData(res?.data ?? null);
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudieron cargar los indicadores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { data, loading, error, recargar };
}
