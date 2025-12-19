import { useState, useEffect, useCallback } from "react";
import { getDashboardIntegral } from "../api/apiClient";
import { toast } from "sonner"; // O tu librería de notificaciones

export default function useDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filtros (por defecto Finca 1, o podrías obtenerlo del usuario)
  const [filtros, setFiltros] = useState({ finca_id: "" });

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Llamamos al endpoint que devuelve { kpi_seguridad, kpi_finanzas, ... }
      const res = await getDashboardIntegral(filtros);
      setData(res.data);
    } catch (err) {
      console.error("Error cargando dashboard:", err);
      setError("No se pudieron cargar los indicadores.");
      // toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { 
    data, 
    loading, 
    error, 
    recargar,
    setFiltro: (k, v) => setFiltros(prev => ({ ...prev, [k]: v })) 
  };
}