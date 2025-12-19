import { useEffect, useState } from "react";
import * as api from "../api/apiClient"; // Asegúrate de importar así o ajustar según tus exports

import useReportes from "../hooks/useReportes";
import ReportTabs from "../components/reportes/ReportTabs";
import ReportFilters from "../components/reportes/ReportFilters";
import EmptyState from "../components/ui/EstadoVacio";

// Paneles
import AltaDireccionPanel from "../components/reportes/panels/AltaDireccionPanel";
import ProduccionPanel from "../components/reportes/panels/ProduccionPanel";
import TareasGestionPanel from "../components/reportes/panels/TareasGestionPanel";
import PagosManoObraPanel from "../components/reportes/panels/PagosManoObraPanel";
// import InventarioResumenPanel from "../components/reportes/panels/InventarioResumenPanel"; // Si aún no lo creamos, coméntalo

export default function Reportes() {
  const {
    tab,
    setTab,
    filtros,
    setFiltro,
    generar,
    loading,
    error,
    data, // data ahora contiene { alta, produccion, tareas, pagos }
  } = useReportes();

  const [cosechas, setCosechas] = useState([]);
  const [lotes, setLotes] = useState([]);

  // Carga inicial de filtros (listas desplegables)
  useEffect(() => {
    (async () => {
      try {
        const [cRes, lRes] = await Promise.all([
          api.listarCosechas(), // Asegúrate que esta función exista en tu apiClient
          api.listarLotes(),
        ]);
        setCosechas(cRes.data?.data || cRes.data || []);
        setLotes(lRes.data?.data || lRes.data || []);
      } catch (e) {
        console.error("Error cargando filtros base:", e);
      }
    })();
  }, []);

  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reportes de Gestión</h1>
            <p className="text-slate-500">
              Inteligencia de negocios para decisiones agronómicas y financieras.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              onClick={() => window.print()}
            >
              🖨️ Imprimir / PDF
            </button>
          </div>
        </div>

        {/* Tabs */}
        <ReportTabs tab={tab} setTab={setTab} />

        {/* Filtros */}
        <ReportFilters
          tab={tab}
          filtros={filtros}
          setFiltro={setFiltro}
          cosechas={cosechas}
          lotes={lotes}
          onGenerar={generar}
          loading={loading}
        />

        {/* Manejo de Errores */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-2">
            ⚠️ <strong>Error:</strong> {error}
          </div>
        )}

        {/* Contenido Dinámico (Paneles) */}
        <div className="min-h-[400px]">
             {loading && (
                 <div className="flex items-center justify-center h-64 text-slate-400">
                     <span className="animate-pulse">Calculando métricas...</span>
                 </div>
             )}

             {!loading && !error && (
                <>
                    {tab === "alta" && <AltaDireccionPanel payload={data.alta} />}
                    {tab === "produccion" && <ProduccionPanel payload={data.produccion} />}
                    {tab === "tareas" && <TareasGestionPanel payload={data.tareas} />}
                    {tab === "pagos" && <PagosManoObraPanel payload={data.pagos} />}
                    {/* {tab === "inventario" && <InventarioResumenPanel payload={data.inventario} />} */}
                </>
             )}
        </div>

      </div>
    </section>
  );
}