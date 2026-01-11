// frontend/src/pages/Reportes.jsx
import useReportes from "../hooks/useReportes";
import ReportTabs from "../components/reportes/ReportTabs";
import EmptyState from "../components/ui/EstadoVacio";
import TareasGestionPanel from "../components/reportes/panels/TareasGestionPanel";
import InventarioResumenPanel from "../components/reportes/panels/InventarioResumenPanel";

export default function Reportes() {
  const {
    tab,
    setTab,
    filtros,
    setFiltro,
    setFiltros,
    generar,
    loading,
    error,
    data,
  } = useReportes();

  const renderPanel = () => {
    if (tab === "tareas") {
      return (
        <TareasGestionPanel
          filtros={filtros}
          setFiltro={setFiltro}
          setFiltros={setFiltros}
          generar={generar}
          loading={loading}
          error={error}
          payload={data?.tareas}
        />
      );
    }

    if (tab === "inventario") {
      return <InventarioResumenPanel titulo="Inventario" />;
    }

    const titulos = {
      alta: "Alta dirección",
      produccion: "Producción / Cosecha",
      inventario: "Inventario",
      pagos: "Mano de obra",
    };

    return (
      <EmptyState>
        <div className="space-y-2">
          <div className="text-base font-semibold text-slate-800">
            {titulos[tab] || "Sección"}
          </div>
          <div className="text-sm text-slate-500">
            Esta sección está en construcción. Próximamente tendrá filtros propios y su reporte.
          </div>
        </div>
      </EmptyState>
    );
  };

  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reportes de Gestión</h1>
            <p className="text-slate-500">
              Inteligencia de negocios para decisiones agronómicas y financieras.
            </p>
          </div>

          <button
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            onClick={() => window.print()}
          >
            🖨️ Imprimir / PDF
          </button>
        </div>

        <ReportTabs tab={tab} setTab={setTab} />

        <div className="min-h-[400px]">{renderPanel()}</div>
      </div>
    </section>
  );
}
