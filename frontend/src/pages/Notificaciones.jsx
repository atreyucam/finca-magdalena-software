import useNotificaciones from "../hooks/useNotificaciones";
import { useLocation, useNavigate } from "react-router-dom";

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

  const navigate = useNavigate();
  const location = useLocation();
  const base = `/${location.pathname.split("/")[1] || "owner"}`;

  async function handleClickItem(n) {
    await marcarLeida(n.id);
    if (n.tipo === "Tarea" && n.referencia?.tarea_id) {
      navigate(`${base}/detalleTarea/${n.referencia.tarea_id}`);
    }
  }

  const ultima = items[0];

  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Notificaciones
            </h1>
            <p className="text-slate-500">
              Avisos del sistema para tus tareas, inventario y pagos. Tienes{" "}
              <span className="font-semibold">{noLeidas}</span> sin leer.
            </p>
          </div>

          <button
            className="inline-flex items-center justify-center rounded-xl border border-emerald-600 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            onClick={marcarTodas}
          >
            Marcar todas como leídas
          </button>
        </div>

        {/* Métricas */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-sky-50 p-4 sm:p-5">
            <div className="text-slate-600">Total de notificaciones</div>
            <div className="mt-1 text-3xl font-bold text-slate-900">
              {total}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-emerald-50 p-4 sm:p-5">
            <div className="text-slate-600">Sin leer</div>
            <div className="mt-1 text-3xl font-bold text-emerald-700">
              {noLeidas}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-amber-50 p-4 sm:p-5">
            <div className="text-slate-600">Última actualización</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              {ultima ? formatRelative(ultima.created_at) : "—"}
            </div>
          </div>
        </div>

        {/* Lista principal */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm divide-y">
          {loading && (
            <p className="text-sm text-center text-slate-400 py-6">
              Cargando notificaciones...
            </p>
          )}

          {!loading && items.length === 0 && (
            <div className="py-8 text-center text-slate-500">
              No tienes notificaciones por el momento.
            </div>
          )}

          {!loading &&
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClickItem(n)}
                className={
                  "w-full text-left px-5 py-4 flex flex-col gap-1 transition-colors " +
                  (n.leida
                    ? "bg-white hover:bg-slate-50"
                    : "bg-emerald-50 hover:bg-emerald-100")
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        "w-2 h-2 rounded-full " +
                        (n.tipo === "Tarea"
                          ? "bg-emerald-500"
                          : n.tipo === "Inventario"
                          ? "bg-sky-500"
                          : "bg-slate-400")
                      }
                    />
                    <span className="text-[11px] uppercase tracking-wide text-slate-500">
                      {n.tipo}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!n.leida && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                        NUEVO
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400">
                      {formatRelative(n.created_at)}
                    </span>
                  </div>
                </div>

                <div className="text-sm font-semibold text-slate-900">
                  {n.titulo}
                </div>

                {n.mensaje && (
                  <div className="text-xs text-slate-600">{n.mensaje}</div>
                )}
              </button>
            ))}

          {/* Botón Cargar más */}
          {!loading && hasMore && (
            <div className="py-4 flex justify-center">
              <button
                onClick={cargarMas}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                disabled={loadingMore}
              >
                {loadingMore ? "Cargando..." : "Cargar más"}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
