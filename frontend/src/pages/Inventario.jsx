// frontend/src/pages/Inventario.jsx
import { useEffect, useMemo, useState } from "react";
import { Plus, Layers, Package, Wrench, Monitor, History } from "lucide-react";

import { alertasStockBajo, getResumenInventario } from "../api/apiClient";
import useUnidades from "../hooks/useUnidades";

import VentanaModal from "../components/ui/VentanaModal";

// Sub-Componentes
import VistaInventario from "../components/inventario/VistaInventario";
import VistaHistorial from "../components/inventario/VistaHistorial";
import AlertasStock from "../components/inventario/AlertasStock";

// Formularios
import FormularioItem from "../components/inventario/FormularioItem";
import FormularioAjuste from "../components/inventario/FormularioAjuste";

import Boton from "../components/ui/Boton";

export default function Inventario() {
  const [tab, setTab] = useState(() => localStorage.getItem("inventarioTab") || "Insumo");
  const [alertas, setAlertas] = useState([]);

  // Cards
  const [resumen, setResumen] = useState({
    total: 0,
    insumos: 0,
    herramientas: 0,
    equipos: 0,
  });

  // ✅ chips Activos / Inactivos / Todos (suaves)
  const [activosFiltro, setActivosFiltro] = useState(
    () => localStorage.getItem("inventarioActivos") || "true"
  );

  // Modales
  const [crearAbierto, setCrearAbierto] = useState(false);
  const [ajustarAbierto, setAjustarAbierto] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState(null);

  // ✅ Clave para forzar recarga de listados (sin recargar página)
  const [refreshKey, setRefreshKey] = useState(0);

  const { unidades } = useUnidades();

  const cargarDatos = async () => {
    try {
      const [resAlertas, resResumen] = await Promise.all([
        alertasStockBajo(),
        getResumenInventario(),
      ]);

      setAlertas(resAlertas.data || []);
      setResumen(
        resResumen.data || { total: 0, insumos: 0, herramientas: 0, equipos: 0 }
      );
    } catch (e) {
      console.error(e);
    }
  };

  const recargarTodo = () => {
    setRefreshKey((prev) => prev + 1);
    cargarDatos();
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    localStorage.setItem("inventarioTab", tab);
  }, [tab]);

  useEffect(() => {
    localStorage.setItem("inventarioActivos", activosFiltro);
  }, [activosFiltro]);

  const abrirAjuste = (item) => {
    setItemSeleccionado(item);
    setAjustarAbierto(true);
  };

  // ✅ Cards suaves (misma lógica de Tareas.jsx: tintes, ring, no sólido)
  const cards = useMemo(() => {
    const baseCard =
      "rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-all";

    const activeBase = "ring-2";

    return [
      {
        key: "TOTAL",
        titulo: "Total Ítems",
        valor: resumen.total,
        icono: Layers,
        // Activo = oscuro como “Total” en Tareas.jsx
        cls: (active) =>
          [
            baseCard,
            active
              ? "bg-slate-800 text-white border-slate-800 shadow-lg shadow-slate-200"
              : "bg-white border-slate-100 text-slate-700 hover:bg-slate-50",
          ].join(" "),
        iconCls: (active) => (active ? "text-slate-200" : "text-slate-500"),
        onClick: () => setTab("Insumo"), // opcional: al click te manda a Insumo
      },
      {
        key: "Insumo",
        titulo: "Insumos",
        valor: resumen.insumos,
        icono: Package,
        cls: (active) =>
          [
            baseCard,
            active
              ? `bg-emerald-100 border-emerald-200 ${activeBase} ring-emerald-100`
              : "bg-emerald-50/50 border-emerald-100 text-emerald-900/60 hover:bg-emerald-50",
          ].join(" "),
        iconCls: () => "text-emerald-600",
        onClick: () => setTab("Insumo"),
      },
      {
        key: "Herramienta",
        titulo: "Herramientas",
        valor: resumen.herramientas,
        icono: Wrench,
        cls: (active) =>
          [
            baseCard,
            active
              ? `bg-amber-100 border-amber-200 ${activeBase} ring-amber-100`
              : "bg-amber-50/50 border-amber-100 text-amber-900/60 hover:bg-amber-50",
          ].join(" "),
        iconCls: () => "text-amber-600",
        onClick: () => setTab("Herramienta"),
      },
      {
        key: "Equipo",
        titulo: "Equipos",
        valor: resumen.equipos,
        icono: Monitor,
        cls: (active) =>
          [
            baseCard,
            active
              ? `bg-violet-100 border-violet-200 ${activeBase} ring-violet-100`
              : "bg-violet-50/50 border-violet-100 text-violet-900/60 hover:bg-violet-50",
          ].join(" "),
        iconCls: () => "text-violet-600",
        onClick: () => setTab("Equipo"),
      },
      {
        key: "Historial",
        titulo: "Historial",
        valor: "—",
        icono: History,
        cls: (active) =>
          [
            baseCard,
            active
              ? `bg-slate-100 border-slate-200 ${activeBase} ring-slate-100`
              : "bg-slate-50/50 border-slate-100 text-slate-900/60 hover:bg-slate-50",
          ].join(" "),
        iconCls: () => "text-slate-600",
        onClick: () => setTab("Historial"),
      },
    ];
  }, [resumen]);

  const tabsSecundarias = ["Insumo", "Herramienta", "Equipo", "Historial"];

  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Inventario y Recursos
            </h1>
            <p className="text-slate-500 font-medium">
              Control de stock, entradas y salidas.
            </p>
          </div>

          {tab !== "Historial" && (
            <div className="flex gap-2">
              <Boton onClick={() => setCrearAbierto(true)} icono={Plus}>
                Nuevo Ítem
              </Boton>
            </div>
          )}
        </div>

        {/* ✅ CARDS (suaves estilo Tareas.jsx) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {cards.map((c) => {
            const Icon = c.icono;
            const active = tab === c.key;

            return (
              <div key={c.key} onClick={c.onClick} className={c.cls(active)}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={18} className={c.iconCls(active)} />
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                    {c.titulo}
                  </span>
                </div>
                <div className={`text-2xl font-black ${active && c.key === "TOTAL" ? "text-white" : ""}`}>
                  {c.valor ?? 0}
                </div>

                {/* Tabs mini (opcional): se siente pro como “chips” internos */}
                {c.key !== "TOTAL" && (
                  <div className="mt-2 text-[11px] font-semibold opacity-70">
                    {active ? "Seleccionado" : "Click para ver"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ✅ PESTAÑAS (respeta tu idea actual, pero estilo Producción/Tareas) */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
            {tabsSecundarias.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={[
                  "px-6 py-2.5 text-sm font-bold rounded-xl transition-all",
                  tab === t
                    ? "bg-white shadow-sm text-slate-900"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/60",
                ].join(" ")}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="mt-4 border-b border-slate-100" />
        </div>

        {/* ✅ Chips Activos/Inactivos/Todos (suaves estilo Tareas.jsx) */}
        {tab !== "Historial" && (
          <div className="mb-6">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              <Chip
                active={activosFiltro === "true"}
                onClick={() => setActivosFiltro("true")}
                label="Activos"
                activeCls="bg-emerald-100 border-emerald-200 ring-2 ring-emerald-100"
                idleCls="bg-emerald-50/40 border-emerald-100 text-emerald-800/70 hover:bg-emerald-50"
                badgeActive="bg-emerald-200 text-emerald-900"
                badgeIdle="bg-emerald-100 text-emerald-700"
              />
              <Chip
                active={activosFiltro === "false"}
                onClick={() => setActivosFiltro("false")}
                label="Inactivos"
                activeCls="bg-slate-100 border-slate-200 ring-2 ring-slate-100"
                idleCls="bg-slate-50/40 border-slate-100 text-slate-800/70 hover:bg-slate-50"
                badgeActive="bg-slate-200 text-slate-900"
                badgeIdle="bg-slate-100 text-slate-700"
              />
              <Chip
                active={activosFiltro === "all"}
                onClick={() => setActivosFiltro("all")}
                label="Todos"
                activeCls="bg-indigo-100 border-indigo-200 ring-2 ring-indigo-100"
                idleCls="bg-indigo-50/40 border-indigo-100 text-indigo-800/70 hover:bg-indigo-50"
                badgeActive="bg-indigo-200 text-indigo-900"
                badgeIdle="bg-indigo-100 text-indigo-700"
              />
            </div>
          </div>
        )}

        {/* Alertas */}
        {tab !== "Historial" && alertas.length > 0 && (
          <div className="mb-6">
            <AlertasStock alertas={alertas} />
          </div>
        )}

        {/* Vistas */}
        <div className="min-h-[420px]">
          {tab === "Historial" ? (
            <VistaHistorial />
          ) : (
            <VistaInventario
              key={`${tab}-${refreshKey}-${activosFiltro}`}
              categoria={tab}
              activosFiltro={activosFiltro} // ✅ nuevo
              onAjustar={abrirAjuste}
            />
          )}
        </div>
      </div>

      {/* MODAL: Crear */}
      <VentanaModal
        abierto={crearAbierto}
        cerrar={() => setCrearAbierto(false)}
        titulo="Registrar Nuevo Ítem"
      >
        <FormularioItem
          unidades={unidades}
          alCancelar={() => setCrearAbierto(false)}
          alGuardar={() => {
            setCrearAbierto(false);
            recargarTodo();
          }}
        />
      </VentanaModal>

      {/* MODAL: Ajuste */}
      <VentanaModal
        abierto={ajustarAbierto}
        cerrar={() => setAjustarAbierto(false)}
        titulo={`Ajuste de Stock: ${itemSeleccionado?.nombre || ""}`}
      >
        <FormularioAjuste
          item={itemSeleccionado}
          unidades={unidades}
          alCancelar={() => setAjustarAbierto(false)}
          alGuardar={() => {
            setAjustarAbierto(false);
            recargarTodo();
          }}
        />
      </VentanaModal>
    </section>
  );
}

function Chip({
  active,
  onClick,
  label,
  activeCls,
  idleCls,
  badgeActive,
  badgeIdle,
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "group flex items-center gap-2 px-5 py-3 rounded-2xl border text-sm font-bold transition-all whitespace-nowrap",
        active ? activeCls : idleCls,
      ].join(" ")}
    >
      <span>{label}</span>
      <span
        className={[
          "text-[10px] px-2 py-0.5 rounded-full font-black",
          active ? badgeActive : badgeIdle,
        ].join(" ")}
      >
        {active ? "ON" : "—"}
      </span>
    </button>
  );
}
