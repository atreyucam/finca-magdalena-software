// src/pages/Produccion.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { listarLotes, listarCosechas, cerrarCosecha } from "../api/apiClient";
import CrearLoteModal from "../components/CrearLoteModal";
import CrearCosechaModal from "../components/CrearCosechaModal";
import GestionPeriodosModal from "../components/GestionPeriodosModal";


export default function Produccion() {
  const [tab, setTab] = useState("lotes"); // "lotes" | "cosechas"

  const [lotes, setLotes] = useState([]);
  const [cosechas, setCosechas] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [loadingCosechas, setLoadingCosechas] = useState(false);
  const [error, setError] = useState(null);

  const [showLoteModal, setShowLoteModal] = useState(false);
  const [showCosechaModal, setShowCosechaModal] = useState(false);

  const [showPeriodosModal, setShowPeriodosModal] = useState(false);
const [cosechaSeleccionada, setCosechaSeleccionada] = useState(null);

  const [closingId, setClosingId] = useState(null); 

  const fetchData = async () => {
    try {
      setError(null);
      setLoading(true);
      setLoadingLotes(true);
      setLoadingCosechas(true);

      const [resLotes, resCosechas] = await Promise.all([
        listarLotes(),
        listarCosechas(),
      ]);

      setLotes(resLotes?.data || resLotes || []);
      setCosechas(resCosechas?.data || resCosechas || []);
    } catch (err) {
      console.error("Error cargando producción:", err);
      setError("No se pudieron cargar los datos de producción.");
    } finally {
      setLoading(false);
      setLoadingLotes(false);
      setLoadingCosechas(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalLotes = lotes.length;
  const totalCosechas = cosechas.length;
  const cosechasEnCurso = cosechas.filter(
    (c) => (c.estado || "").toLowerCase() === "activa" || (c.estado || "").toLowerCase() === "en curso"
  ).length;

  const isLoadingTab =
    tab === "lotes" ? loadingLotes || loading : loadingCosechas || loading;

  // callback cuando se crea algo
  const handleCreated = async () => {
    await fetchData();
  };

   // 🔹 Handler para cerrar cosecha
  const handleCerrarCosecha = async (cosecha) => {
    if (!cosecha || !cosecha.id) return;
    const estado = (cosecha.estado || "").toLowerCase();
    if (estado === "cerrada") return;

    const confirmar = window.confirm(
      `¿Cerrar la cosecha "${cosecha.nombre}"? Esta acción no se puede deshacer.`
    );
    if (!confirmar) return;

    const hoy = new Date().toISOString().slice(0, 10);
    const fecha_fin = window.prompt(
      "Ingresa la fecha de fin de la cosecha (YYYY-MM-DD):",
      hoy
    );
    if (!fecha_fin) return;

    try {
      setClosingId(cosecha.id);
      await cerrarCosecha(cosecha.id, { fecha_fin });
      toast.success("Cosecha cerrada correctamente");
      await fetchData();
    } catch (err) {
      console.error("Error cerrando cosecha", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "No se pudo cerrar la cosecha";
      toast.error(msg);
    } finally {
      setClosingId(null);
    }
  };

  const handleGestionarPeriodos = (cosecha) => {
  setCosechaSeleccionada(cosecha);
  setShowPeriodosModal(true);
};



  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Producción</h1>
            <p className="text-slate-500">
              Gestión de lotes permanentes y periodos de cosecha de la finca.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* <button
              onClick={fetchData}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Recargar datos
            </button> */}

            {tab === "lotes" ? (
              <button
                type="button"
                onClick={() => setShowLoteModal(true)}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-700"
              >
                Nuevo lote
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowCosechaModal(true)}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-700"
              >
                Nueva cosecha
              </button>
            )}
          </div>
        </div>

{/* Toggle Lotes / Cosechas */}
<div className="mb-2">
  <h2 className="text-md font-semibold text-slate-600">Secciones</h2>
</div>

<div className="mb-6 flex items-center gap-3">
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-1 inline-flex">
    <button
      onClick={() => setTab("lotes")}
      className={[
        "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
        tab === "lotes"
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-600 hover:text-slate-800",
      ].join(" ")}
    >
      Lotes
    </button>

    <button
      onClick={() => setTab("cosechas")}
      className={[
        "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
        tab === "cosechas"
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-600 hover:text-slate-800",
      ].join(" ")}
    >
      Cosechas
    </button>
  </div>
</div>


        {/* Cards métricas */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-emerald-50 p-4 sm:p-5">
            <div className="text-slate-600">Lotes registrados</div>
            <div className="mt-1 text-3xl font-bold text-emerald-700">
              {totalLotes}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Unidades físicas permanentes de producción.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-sky-50 p-4 sm:p-5">
            <div className="text-slate-600">Cosechas registradas</div>
            <div className="mt-1 text-3xl font-bold text-slate-900">
              {totalCosechas}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Periodos de producción históricos y activos.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-amber-50 p-4 sm:p-5">
            <div className="text-slate-600">Cosechas en curso</div>
            <div className="mt-1 text-3xl font-bold text-amber-700">
              {cosechasEnCurso}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Períodos actualmente activos para la finca.
            </p>
          </div>
        </div>

        <div className="mb-4 h-px w-full bg-slate-200" />

        {/* Título dinámico Lotes/Cosechas */}
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          {tab === "lotes" ? "Lotes" : "Cosechas"}
        </h2>

        {/* Mensajes de error / loading */}
        {error && (
          <p className="mb-4 text-sm text-rose-600">{error}</p>
        )}
        {isLoadingTab && (
          <p className="mb-4 text-sm text-slate-500">Cargando datos…</p>
        )}

        {/* Contenido principal por tab */}
        {tab === "lotes" ? (
          <SeccionLotes lotes={lotes} loading={isLoadingTab} />
        ) : (
          <SeccionCosechas 
          cosechas={cosechas} 
          loading={isLoadingTab} 
          onCerrar={handleCerrarCosecha}
            closingId={closingId}
            onGestionarPeriodos={handleGestionarPeriodos}
            />
        )}
      </div>

      {/* Modales */}
      <CrearLoteModal
        open={showLoteModal}
        onClose={() => setShowLoteModal(false)}
        onCreated={handleCreated}
      />
      <CrearCosechaModal
        open={showCosechaModal}
        onClose={() => setShowCosechaModal(false)}
        onCreated={handleCreated}
      />
      <GestionPeriodosModal
  open={showPeriodosModal}
  onClose={() => setShowPeriodosModal(false)}
  cosecha={cosechaSeleccionada}
  onUpdated={fetchData}
/>

    </section>
  );
}

/* ... aquí siguen tus SeccionLotes y SeccionCosechas igual que ya las tienes ... */




/* =============== SECCIÓN LOTES =============== */

function SeccionLotes({ lotes, loading }) {
  const navigate = useNavigate();
  if (!loading && lotes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        No hay lotes registrados. Crea el primer lote con el botón{" "}
        <span className="font-semibold">“Nuevo lote”</span>.
      </div>
    );
  }

  if (loading) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {lotes.map((lote) => {
        const nombre = lote.nombre || `Lote #${lote.id ?? "?"}`;
        const plantas = lote.numero_plantas ?? "—";
        const superficie = lote.superficie_ha ?? "—";
        const estado = lote.estado || "Activo";
        const fechaSiembra = lote.fecha_siembra;

        const estadoClasses = [
          "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
          estado === "Activo"
            ? "bg-emerald-100 text-emerald-700"
            : estado === "Inactivo"
            ? "bg-rose-100 text-rose-700"
            : "bg-slate-100 text-slate-700",
        ].join(" ");

        return (
          <article
            key={lote.id || nombre}
            className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                {nombre}
              </h3>
              <span className={estadoClasses}>{estado}</span>
            </div>

            <dl className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between gap-2">
                <dt className="font-medium text-slate-500">
                  Nº de plantas
                </dt>
                <dd>{plantas}</dd>
              </div>

              <div className="flex justify-between gap-2">
                <dt className="font-medium text-slate-500">Superficie</dt>
                <dd>{superficie} ha</dd>
              </div>

              <div className="flex justify-between gap-2">
                <dt className="font-medium text-slate-500">
                  Fecha de siembra
                </dt>
                <dd>
                  {fechaSiembra
                    ? new Date(fechaSiembra).toLocaleDateString("es-EC", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                      })
                    : "Sin registro"}
                </dd>
              </div>
            </dl>

            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => navigate(`/owner/produccion/lotes/${lote.id}`)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Ver detalle
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Ver reporte
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
/* =============== SECCIÓN COSECHAS =============== */

function SeccionCosechas({ cosechas, loading, onCerrar, closingId, onGestionarPeriodos }) {
  if (!loading && cosechas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        No hay cosechas registradas. Crea una nueva cosecha para comenzar a
        agrupar la producción por períodos.
      </div>
    );
  }

  if (loading) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cosechas.map((c) => {
        const nombre =
          c.nombre || c.nombre_cosecha || `Cosecha #${c.id ?? "?"}`;
        const estado = c.estado || "Activa";
        const inicio = c.fecha_inicio || c.fecha_desde || c.desde;
        const fin = c.fecha_fin || c.fecha_hasta || c.hasta;
        const totalKg = c.total_kg ?? c.kg_totales ?? null;
        const anioAgricola = c.anio_agricola;
        const codigo = c.codigo;

        const estadoClasses = [
          "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
          estado.toLowerCase() === "activa" || estado.toLowerCase() === "en curso"
            ? "bg-sky-100 text-sky-700"
            : estado.toLowerCase() === "cerrada"
            ? "bg-slate-200 text-slate-800"
            : "bg-amber-100 text-amber-700",
        ].join(" ");

        const puedeCerrar = estado.toLowerCase() === "activa";

        return (
          <article
            key={c.id || nombre}
            className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                {nombre}
              </h3>
              <span className={estadoClasses}>{estado}</span>
            </div>

            <dl className="space-y-1 text-xs text-slate-600">
              {anioAgricola && (
                <div className="flex justify-between gap-2">
                  <dt className="font-medium text-slate-500">
                    Año agrícola
                  </dt>
                  <dd>{anioAgricola}</dd>
                </div>
              )}

              {codigo && (
                <div className="flex justify-between gap-2">
                  <dt className="font-medium text-slate-500">Código</dt>
                  <dd className="font-mono text-[11px]">{codigo}</dd>
                </div>
              )}

              <div className="flex justify-between gap-2">
                <dt className="font-medium text-slate-500">Periodo</dt>
                <dd>
                  {inicio
                    ? new Date(inicio).toLocaleDateString("es-EC", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                      })
                    : "—"}{" "}
                  –{" "}
                  {fin
                    ? new Date(fin).toLocaleDateString("es-EC", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                      })
                    : "—"}
                </dd>
              </div>

              {totalKg !== null && (
                <div className="flex justify-between gap-2">
                  <dt className="font-medium text-slate-500">
                    Producción total
                  </dt>
                  <dd>{totalKg} kg</dd>
                </div>
              )}
            </dl>

            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Ver detalle
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Ver tareas
              </button>
              <button
                type="button"
                className="rounded-xl border border-emerald-500 bg-white px-3 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Ver reporte
              </button>

              {/* 👉 NUEVO: gestionar periodos */}
  <button
    type="button"
    onClick={() => onGestionarPeriodos?.(c)}
    className="rounded-xl border border-sky-300 bg-sky-50 px-3 py-1.5 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
  >
    Gestionar periodos
  </button>

              {puedeCerrar && (
                <button
                  type="button"
                  onClick={() => onCerrar?.(c)}
                  disabled={closingId === c.id}
                  className="rounded-xl bg-amber-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {closingId === c.id ? "Cerrando…" : "Cerrar cosecha"}
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
