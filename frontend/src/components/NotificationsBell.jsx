// frontend/src/components/NotificationsBell.jsx
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PiBellRingingBold } from "react-icons/pi";
import useNotificaciones from "../hooks/useNotificaciones";

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

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState("todas"); // 'todas' | 'noLeidas'
  const { items, noLeidas, loading, marcarLeida, marcarTodas, cargar } =
    useNotificaciones(); // 👈 ahora también traemos cargar
  const navigate = useNavigate();
  const location = useLocation();
  const ref = useRef(null);

  const base = `/${location.pathname.split("/")[1] || "owner"}`;

  const filtradas =
    filtro === "noLeidas" ? items.filter((n) => !n.leida) : items;

  // Cerrar al hacer click fuera (para escritorio)
  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function handleClickItem(n) {
    await marcarLeida(n.id);

    if (n.tipo === "Tarea" && n.referencia?.tarea_id) {
      navigate(`${base}/detalleTarea/${n.referencia.tarea_id}`);
    } else {
      navigate(`${base}/notificaciones`);
    }

    setOpen(false);
  }

  // Tarjeta flotante reutilizable
  const card = (
    <div className="w-[360px] max-w-[calc(100vw-2rem)] max-h-[420px] origin-top rounded-2xl bg-white shadow-xl ring-1 ring-black/5 text-sm flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-slate-100">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Notificaciones
          </p>
          <p className="text-xs text-slate-500">Avisos del sistema.</p>
        </div>
        <button
          className="text-[11px] text-emerald-600 hover:text-emerald-700"
          onClick={async () => {
            await marcarTodas();
          }}
        >
          Marcar todas como leídas
        </button>
      </div>

      {/* Filtros */}
      <div className="px-4 pt-2 pb-1 flex gap-2 text-xs">
        {["todas", "noLeidas"].map((op) => (
          <button
            key={op}
            onClick={() => setFiltro(op)}
            className={
              "px-2 py-1 rounded-full border text-xs " +
              (filtro === op
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-slate-50 text-slate-600 border-slate-200")
            }
          >
            {op === "todas" ? "Todas" : "No leídas"}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
        {loading && (
          <p className="text-xs text-center text-slate-400 py-3">
            Cargando notificaciones...
          </p>
        )}
        {!loading && filtradas.length === 0 && (
          <p className="text-xs text-center text-slate-400 py-3">
            No tienes notificaciones.
          </p>
        )}
        {filtradas.map((n) => (
          <button
            key={n.id}
            onClick={() => handleClickItem(n)}
            className={
              "w-full text-left rounded-xl px-3 py-2 border flex flex-col gap-1 " +
              (n.leida
                ? "bg-white border-slate-200"
                : "bg-emerald-50 border-emerald-200")
            }
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={
                    "w-2 h-2 rounded-full " +
                    (n.tipo === "Tarea" ? "bg-emerald-500" : "bg-slate-400")
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
                <span className="text-[10px] text-slate-400">
                  {formatRelative(n.created_at)}
                </span>
              </div>
            </div>
            <div className="text-xs font-semibold text-slate-900 line-clamp-2">
              {n.titulo}
            </div>
            {n.mensaje && (
              <div className="text-[11px] text-slate-600 line-clamp-2">
                {n.mensaje}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="relative" ref={ref}>
      {/* Botón de campana */}
      <button
        className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-emerald-600 transition-colors"
        onClick={async () => {
          const next = !open;
          setOpen(next);
          // 👇 cada vez que se abre, recargamos del backend
          if (!open) {
            cargar();
          }
        }}
      >
        <PiBellRingingBold size={20} />
        {noLeidas > 0 && (
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
        )}
      </button>

      {open && (
        <>
          {/* 📱 Móvil: modal centrado */}
          <div
            className="fixed inset-0 z-40 flex items-start justify-center pt-20 bg-black/5 sm:hidden"
            onClick={() => setOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="animate-in fade-in zoom-in-95 duration-100"
            >
              {card}
            </div>
          </div>

          {/* 💻 Escritorio: dropdown pegado a la campana */}
          <div className="hidden sm:block absolute right-0 mt-2 z-40 animate-in fade-in zoom-in-95 duration-100">
            {card}
          </div>
        </>
      )}
    </div>
  );
}
