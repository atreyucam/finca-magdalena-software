import { useEffect, useMemo, useState } from "react";

import { listarFincasReporte } from "../api/apiClient";
import useReportes from "../hooks/useReportes";

import PageIntro from "../components/app/PageIntro";
import ReportTabs from "../components/reportes/ReportTabs";
import GlobalReportFilters from "../components/reportes/filters/GlobalReportFilters";
import AltaDireccionPanel from "../components/reportes/panels/AltaDireccionPanel";
import ComercialVentasPanel from "../components/reportes/panels/ComercialVentasPanel";
import AbastecimientoComprasPanel from "../components/reportes/panels/AbastecimientoComprasPanel";
import TareasGestionPanel from "../components/reportes/panels/TareasGestionPanel";
import InventarioResumenPanel from "../components/reportes/panels/InventarioResumenPanel";
import PagosManoObraPanel from "../components/reportes/panels/PagosManoObraPanel";
import Badge from "../components/ui/Badge";

const SECTION_COPY = {
  alta: "Visión ejecutiva operativa/comercial consolidada.",
  comercial: "Rendimiento comercial de ventas por estado, finca, cliente y lote.",
  abastecimiento: "Gasto, proveedores, ítems comprados y variación de costos.",
  operacion: "Se reutiliza el panel analítico/transaccional actual de tareas.",
  rrhh: "Se reutiliza el panel actual de mano de obra y pagos.",
  inventario: "Se reutiliza el panel actual de inventario con sus filtros específicos.",
};

function toYmd(date) {
  const value = new Date(date);
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const dd = String(value.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function defaultRange() {
  const today = new Date();
  const from = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
  return { desde: toYmd(from), hasta: toYmd(today) };
}

function monthRange() {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  return { desde: toYmd(from), hasta: toYmd(today) };
}

export default function Reportes() {
  const [tab, setTab] = useState("alta");
  const [fincas, setFincas] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  const initialRange = useMemo(() => defaultRange(), []);
  const [draftFilters, setDraftFilters] = useState({
    finca_ids: [],
    desde: initialRange.desde,
    hasta: initialRange.hasta,
  });
  const [appliedFilters, setAppliedFilters] = useState({
    finca_ids: [],
    desde: initialRange.desde,
    hasta: initialRange.hasta,
  });

  const legacyReportes = useReportes();

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setLoadingFilters(true);
        const response = await listarFincasReporte();
        const list = response?.data || response || [];
        if (!active) return;
        setFincas(Array.isArray(list) ? list : []);
      } catch {
        if (!active) return;
        setFincas([]);
      } finally {
        if (active) setLoadingFilters(false);
      }
    };

    run();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (tab === "operacion") {
      legacyReportes.setTab("tareas");
    }
  }, [tab, legacyReportes.setTab]);

  const fincasOptions = useMemo(
    () => (fincas || []).map((finca) => ({ value: Number(finca.id), label: finca.nombre })),
    [fincas]
  );

  const activeNote = useMemo(() => {
    if (tab === "abastecimiento") {
      return "Compras aún no tiene relación directa con finca en el modelo actual; la limitación se documenta dentro del reporte.";
    }
    if (tab === "alta") {
      return "Alta Dirección consume ventas, compras, nómina, tareas vencidas y alertas de inventario. Compras y nómina por finca se muestran como N/D cuando el dominio no lo soporta.";
    }
    if (tab === "operacion" || tab === "rrhh" || tab === "inventario") {
      return "Estos paneles fueron reutilizados de la versión actual. Mantienen filtros propios mientras se completa su migración plena al esquema global en fases siguientes.";
    }
    return "Los filtros globales soportan una, varias o todas las fincas activas, además del rango de fechas.";
  }, [tab]);

  const setDraftField = (field, value) => {
    setDraftFilters((prev) => ({ ...prev, [field]: value }));
  };

  const applyPreset = (preset) => {
    const today = toYmd(new Date());

    if (preset === "hoy") {
      setDraftFilters((prev) => ({ ...prev, desde: today, hasta: today }));
      return;
    }

    if (preset === "7d") {
      const from = new Date();
      from.setDate(from.getDate() - 6);
      setDraftFilters((prev) => ({ ...prev, desde: toYmd(from), hasta: today }));
      return;
    }

    if (preset === "30d") {
      const range = defaultRange();
      setDraftFilters((prev) => ({ ...prev, ...range }));
      return;
    }

    if (preset === "mes") {
      const range = monthRange();
      setDraftFilters((prev) => ({ ...prev, ...range }));
    }
  };

  const applyFilters = () => {
    setAppliedFilters({
      finca_ids: Array.isArray(draftFilters.finca_ids) ? draftFilters.finca_ids : [],
      desde: draftFilters.desde,
      hasta: draftFilters.hasta,
    });
  };

  const resetFilters = () => {
    const range = defaultRange();
    const reset = { finca_ids: [], ...range };
    setDraftFilters(reset);
    setAppliedFilters(reset);
  };

  const renderPanel = () => {
    if (tab === "alta") {
      return <AltaDireccionPanel filters={appliedFilters} />;
    }

    if (tab === "comercial") {
      return <ComercialVentasPanel filters={appliedFilters} />;
    }

    if (tab === "abastecimiento") {
      return <AbastecimientoComprasPanel filters={appliedFilters} />;
    }

    if (tab === "operacion") {
      return (
        <TareasGestionPanel
          filtros={legacyReportes.filtros}
          setFiltro={legacyReportes.setFiltro}
          setFiltros={legacyReportes.setFiltros}
          generar={legacyReportes.generar}
          loading={legacyReportes.loading}
          error={legacyReportes.error}
          payload={legacyReportes.data?.tareas}
        />
      );
    }

    if (tab === "rrhh") {
      return <PagosManoObraPanel titulo="Recursos Humanos" />;
    }

    if (tab === "inventario") {
      return <InventarioResumenPanel titulo="Inventario" />;
    }

    return null;
  };

  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1450px] space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <PageIntro
                title="Reportes"
                subtitle={SECTION_COPY[tab]}
                actions={
                  <>
                    <Badge variante="info">Fase 1</Badge>
                    <Badge variante="warning">Producción / Cosecha fuera de esta etapa</Badge>
                  </>
                }
              />
            </div>

            <ReportTabs tab={tab} setTab={setTab} />
          </div>
        </div>

        <GlobalReportFilters
          filters={draftFilters}
          fincasOptions={fincasOptions}
          onChange={setDraftField}
          onApply={applyFilters}
          onReset={resetFilters}
          onPreset={applyPreset}
          loading={loadingFilters}
          note={activeNote}
        />

        {renderPanel()}
      </div>
    </section>
  );
}
