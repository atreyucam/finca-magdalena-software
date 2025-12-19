import { useState, useEffect } from 'react';
import * as api from '../api/apiClient'; 

export default function useReportes() {
  const [tab, setTab] = useState("alta"); // alta | produccion | tareas | inventario | pagos
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    alta: null,
    produccion: null,
    tareas: null,
    pagos: null
  });
  
  // Filtros
  const [filtros, setFiltrosState] = useState({
    cosecha_id: "",
    lote_id: "",
    desde: "",
    hasta: "",
    finca_id: 1, // ⚠️ TODO: Esto debería venir de un Contexto Global o Selector de Fincas
  });

  const setFiltro = (key, value) => {
    setFiltrosState(prev => ({ ...prev, [key]: value }));
  };

  const generar = async () => {
    setLoading(true);
    setError(null);
    
    console.log(`📡 [useReportes] Generando reporte: ${tab}`, filtros);

    try {
      const params = { ...filtros }; 
      let responseData = null;

      switch (tab) {
        case "alta":
          // Dashboard Integral
          const resAlta = await api.getDashboardIntegral(params);
          console.log("✅ [API] Alta Dirección:", resAlta.data);
          responseData = { alta: resAlta.data };
          break;

        case "produccion":
          // Cosecha Rendimiento
          const resProd = await api.getReporteRendimiento(params);
          console.log("✅ [API] Producción:", resProd.data);
          responseData = { produccion: resProd.data };
          break;

        case "tareas":
          // Operaciones + Fito (Llamada paralela)
          const [resOps, resFito] = await Promise.all([
            api.getReporteOperaciones(params),
            api.getReporteFitosanitario(params)
          ]);
          console.log("✅ [API] Tareas:", resOps.data);
          console.log("✅ [API] Fitosanitario:", resFito.data);
          
          responseData = { 
            tareas: {
                operaciones: resOps.data,
                fitosanitario: resFito.data
            }
          };
          break;

        case "pagos": 
          // Costos
          const resCostos = await api.getReporteCostos(params);
          console.log("✅ [API] Costos:", resCostos.data);
          responseData = { pagos: resCostos.data };
          break;
          
        default:
          break;
      }

      if (responseData) {
        setData(prev => ({ ...prev, ...responseData }));
      }

    } catch (err) {
      console.error("❌ [useReportes] Error:", err);
      setError(err.response?.data?.message || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  // Cargar automáticamente al entrar (opcional)
  useEffect(() => {
    generar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]); // Recarga si cambia el tab

  return {
    tab,
    setTab,
    filtros,
    setFiltro,
    generar,
    loading,
    error,
    data,
  };
}