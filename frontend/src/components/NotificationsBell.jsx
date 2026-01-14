import { useEffect, useRef, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PiBellRingingBold } from "react-icons/pi";
import useNotificaciones from "../hooks/useNotificaciones";
import useToast from "../hooks/useToast";

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
  const notify = useToast();

  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState("todas");

  const { items, noLeidas, loading, marcarLeida, marcarTodas, cargar } =
    useNotificaciones();

  const navigate = useNavigate();
  const location = useLocation();
  const ref = useRef(null);

  const base = useMemo(
    () => `/${location.pathname.split("/")[1] || "owner"}`,
    [location.pathname]
  );

  const filtradas = useMemo(() => {
    return filtro === "noLeidas" ? items.filter((n) => !n.leida) : items;
  }, [filtro, items]);

  // ✅ 1) Polling: refrescar cada 20s (para que el badge cambie sin recargar)
  useEffect(() => {
    const id = setInterval(() => {
      cargar?.(); // si tu store ya evita spam, perfecto
    }, 20000);
    return () => clearInterval(id);
  }, [cargar]);

  // ✅ 2) Refrescar cuando vuelves a la pestaña
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") cargar?.();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [cargar]);

  // ✅ 3) Toast SOLO cuando aumentan las no leídas
  const prevNoLeidasRef = useRef(noLeidas ?? 0);
  useEffect(() => {
    const prev = prevNoLeidasRef.current ?? 0;
    const curr = noLeidas ?? 0;

    if (curr > prev) {
      const diff = curr - prev;
      notify.info(
        diff === 1
          ? "Tienes 1 notificación nueva"
          : `Tienes ${diff} notificaciones nuevas`,
        { duration: 2500 }
      );
    }

    prevNoLeidasRef.current = curr;
  }, [noLeidas, notify]);

  // ✅ Cargar SOLO cuando se abre (bien)
  useEffect(() => {
    if (open) cargar?.();
  }, [open, cargar]);

  // cerrar click fuera
  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
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

  const badgeText = useMemo(() => {
    const n = Number(noLeidas) || 0;
    if (n <= 0) return null;
    return n > 9 ? "9+" : String(n);
  }, [noLeidas]);

  const card = (
    <div className="w-[360px] max-w-[calc(100vw-2rem)] max-h-[420px] origin-top rounded-2xl bg-white shadow-xl ring-1 ring-black/5 text-sm flex flex-col">
      <div className="flex items-start justify-between px-4 py-3 border-b border-slate-100">
        <div>
          <p className="text-sm font-semibold text-slate-900">Notificaciones</p>
          <p className="text-xs text-slate-500">Avisos del sistema.</p>
        </div>
        <button
          className="text-[11px] text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
          onClick={marcarTodas}
          disabled={(Number(noLeidas) || 0) === 0}
        >
          Marcar todas como leídas
        </button>
      </div>

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
      <button
        className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-emerald-600 transition-colors"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notificaciones"
      >
        <PiBellRingingBold size={20} />

        {/* ✅ Badge con número */}
        {badgeText && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
            {badgeText}
          </span>
        )}
      </button>

      {open && (
        <>
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

          <div className="hidden sm:block absolute right-0 mt-2 z-40 animate-in fade-in zoom-in-95 duration-100">
            {card}
          </div>
        </>
      )}
    </div>
  );
}
