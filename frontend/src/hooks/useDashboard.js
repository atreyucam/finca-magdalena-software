import { useState, useEffect, useCallback } from "react";
import { getDashboardResumen } from "../api/apiClient";
import { toast } from "sonner";

export default function useDashboard() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await getDashboardResumen();
      setDatos(res.data);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar la información del dashboard.");
      toast.error("Error de conexión al cargar métricas");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  return { datos, cargando, error, recargar: cargarDatos };
}