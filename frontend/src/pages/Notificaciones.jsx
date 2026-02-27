// frontend/src/pages/Notificaciones.jsx
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useNotificaciones from "../hooks/useNotificaciones";

import Paginador from "../components/ui/Paginador";
import {
  Tabla,
  TablaCabecera,
  TablaHead,
  TablaCuerpo,
  TablaFila,
  TablaCelda,
  TablaVacia,
} from "../components/ui/Tabla";

function formatRelative(dateStr) {
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "justo ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} horas`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `hace ${diffD} días`;
  const diffM = Math.floor(diffD / 30);
  return `hace ${diffM} meses`;
}

const PAGE_SIZE = 20;

export default function Notificaciones() {
  const {
    items,
    loading,
    loadingMore,
    total,
    noLeidas,
    hasMore,
    marcarLeida,
    marcarTodas,
    cargarMas,
  } = useNotificaciones();

  const [pagina, setPagina] = useState(1);

  const navigate = useNavigate();
  const location = useLocation();
  const base = `/${location.pathname.split("/")[1] || "owner"}`;

  const totalPaginas = useMemo(() => {
    const t = Number(total) || 0;
    return Math.max(1, Math.ceil(t / PAGE_SIZE));
  }, [total]);

  const ultima = items?.[0];

  const visibleItems = useMemo(() => {
    const start = (pagina - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return (items || []).slice(start, end);
  }, [items, pagina]);

  async function handleClickItem(n) {
    await marcarLeida(n.id);

    // Navegación por tipo
    if (n.tipo === "Tarea" && n.referencia?.tarea_id) {
      navigate(`${base}/detalleTarea/${n.referencia.tarea_id}`);
    }
  }

  async function onCambiarPagina(nueva) {
    const next = Math.min(Math.max(1, nueva), totalPaginas);

    // Si el usuario va a una página cuyo rango aún no está cargado,
    // y el hook soporta "cargarMas", intentamos traer más datos.
    const needed = next * PAGE_SIZE;
    const loaded = (items || []).length;

    if (needed > loaded && hasMore && !loadingMore) {
      await cargarMas();
    }

    setPagina(next);
  }

  const dotColor = (tipo) => {
    if (tipo === "Tarea") return "bg-emerald-500";
    if (tipo === "Inventario") return "bg-sky-500";
    if (tipo === "Pago") return "bg-amber-500";
    return "bg-slate-400";
  };

  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Notificaciones</h1>
            <p className="text-slate-500">
              Avisos del sistema para tus tareas, inventario y pagos. Tienes{" "}
              <span className="font-semibold">{noLeidas}</span> sin leer.
            </p>
          </div>

          <button
            className="inline-flex items-center justify-center rounded-xl border border-emerald-600 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
            onClick={marcarTodas}
            disabled={loading || (items?.length || 0) === 0}
          >
            Marcar todas como leídas
          </button>
        </div>

        {/* Métricas */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-sky-50 p-4 sm:p-5">
            <div className="text-slate-600">Total de notificaciones</div>
            <div className="mt-1 text-3xl font-bold text-slate-900">{total}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-emerald-50 p-4 sm:p-5">
            <div className="text-slate-600">Sin leer</div>
            <div className="mt-1 text-3xl font-bold text-emerald-700">{noLeidas}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-amber-50 p-4 sm:p-5">
            <div className="text-slate-600">Última actualización</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              {ultima ? formatRelative(ultima.created_at) : "—"}
            </div>
          </div>
        </div>

        {/* Tabla */}
        <Tabla className="rounded-2xl">
          <TablaCabecera>
            <TablaHead>Tipo</TablaHead>
            <TablaHead>Detalle</TablaHead>
            <TablaHead align="center">Estado</TablaHead>
            <TablaHead align="right">Fecha</TablaHead>
          </TablaCabecera>

          <TablaCuerpo>
            {loading && (
              <TablaFila>
                <TablaCelda colSpan={4} nowrap={false} className="py-10 text-center text-slate-400">
                  Cargando notificaciones...
                </TablaCelda>
              </TablaFila>
            )}

            {!loading && (items?.length || 0) === 0 && (
              <TablaVacia mensaje="No tienes notificaciones por el momento." colSpan={4} />
            )}

            {!loading &&
              visibleItems.map((n) => (
                <TablaFila
                  key={n.id}
                  onClick={() => handleClickItem(n)}
                  className={[
                    n.leida ? "" : "bg-emerald-50",
                    "hover:bg-slate-50/80",
                  ].join(" ")}
                >
                  <TablaCelda>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${dotColor(n.tipo)}`} />
                      <span className="text-[11px] uppercase tracking-wide text-slate-500">
                        {n.tipo}
                      </span>
                    </div>
                  </TablaCelda>

                  <TablaCelda nowrap={false}>
                    <div className="text-sm font-semibold text-slate-900">{n.titulo}</div>
                    {n.mensaje ? (
                      <div className="mt-0.5 text-xs text-slate-600">{n.mensaje}</div>
                    ) : null}
                  </TablaCelda>

                  <TablaCelda align="center">
                    {!n.leida ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        NUEVO
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Leída</span>
                    )}
                  </TablaCelda>

                  <TablaCelda align="right">
                    <span className="text-[11px] text-slate-400">
                      {formatRelative(n.created_at)}
                    </span>
                  </TablaCelda>
                </TablaFila>
              ))}
          </TablaCuerpo>
        </Tabla>

        <Paginador
          paginaActual={pagina}
          totalPaginas={totalPaginas}
          onCambiarPagina={onCambiarPagina}
          totalRegistros={total}
          mostrarSiempre={true}
        />

        {/* Hint de carga incremental */}
        {!loading && hasMore && (
          <p className="mt-3 text-xs text-slate-400">
            Mostrando {items.length} de {total}. (Se cargan más al avanzar de página)
          </p>
        )}
      </div>
    </section>
  );
}
