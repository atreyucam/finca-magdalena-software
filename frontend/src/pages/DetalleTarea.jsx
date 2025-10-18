// src/pages/TaskDetailPage.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
import {
  obtenerTarea,
  listarNovedadesTarea,
  crearNovedadTarea,
  listarInsumosTarea,
  listarRequerimientosTarea,
  verificarTarea,
  iniciarTarea,
  completarTarea,
} from "../api/apiClient";
import InsumosRequerimientosModal from "../components/InsumosRequerimientosModal";
import AsignacionesModal from "../components/AsignacionesModal";

// 👇 tus componentes UI
import Avatar from "../components/Avatar";

import { HiOutlineUser } from "react-icons/hi";

/* ----------------------- Utilidades UI ----------------------- */
const fmtDT = (v) => (v ? new Date(v).toLocaleString() : "—");
const initials = (name = "") =>
  name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

function Chip({ children, color = "blue" }) {
  const map = {
    blue: "bg-sky-50 text-sky-700 border-sky-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    yellow: "bg-amber-50 text-amber-700 border-amber-200",
    purple: "bg-violet-50 text-violet-700 border-violet-200",
    gray: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${
        map[color] || map.blue
      }`}
    >
      {children}
    </span>
  );
}

/* estilos reutilizables coherentes */
const inputBase =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";
const textareaBase =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";
const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-700";
const btnGhost =
  "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";

// avatar helper
const avatarColorFor = (seed = "") => {
  const palette = [
    ["bg-indigo-100", "text-indigo-600"],
    ["bg-emerald-100", "text-emerald-700"],
    ["bg-amber-100", "text-amber-700"],
    ["bg-sky-100", "text-sky-700"],
    ["bg-violet-100", "text-violet-700"],
    ["bg-rose-100", "text-rose-700"],
    ["bg-slate-100", "text-slate-700"],
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 9973;
  return palette[h % palette.length].join(" ");
};

/* ======================== PAGE ======================== */
export default function TaskDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const tareaId = Number(id);

  const role = (useAuthStore((s) => s.getRole()) || "").trim();
  const isWorker = role === "Trabajador";
  const canEdit = !isWorker;

  // base
  const [loading, setLoading] = useState(true);
  const [tarea, setTarea] = useState(null);
  const [error, setError] = useState(null);

  // modales
  const [editInsumosOpen, setEditInsumosOpen] = useState(false);
  const [asignModalOpen, setAsignModalOpen] = useState(false);

  // modal unificado completar / verificar
  const [actionModal, setActionModal] = useState({ open: false, kind: null }); // 'complete' | 'verify'
  const [actionNote, setActionNote] = useState("");
  const actionPanelRef = useRef(null);

  // novedades
  const [novedades, setNovedades] = useState([]);
  const [textoNovedad, setTextoNovedad] = useState("");

  // resumen insumos/requerimientos
  const [insumos, setInsumos] = useState([]);
  const [reqHerr, setReqHerr] = useState([]);
  const [reqEq, setReqEq] = useState([]);

  const herramientasReq = useMemo(() => tarea?.detalles?.herramientas || [], [tarea]);
  const equiposReq = useMemo(() => tarea?.detalles?.equipos || [], [tarea]);

  /* ----------------------- CARGA INICIAL ----------------------- */
  const refreshAll = async () => {
    try {
      setLoading(true);
      const [tRes, nRes, iRes, rRes] = await Promise.all([
        obtenerTarea(tareaId),
        listarNovedadesTarea(tareaId),
        listarInsumosTarea(tareaId),
        listarRequerimientosTarea(tareaId),
      ]);
      setTarea(tRes.data);
      setNovedades(nRes.data || []);
      setInsumos(iRes.data || []);
      const reqs = rRes?.data || [];
      setReqHerr(
        reqs
          .filter((r) => r.categoria === "Herramienta")
          .map((r) => ({ item_id: r.item_id, nombre: r.item, cantidad: Number(r.cantidad) || 1 }))
      );
      setReqEq(
        reqs
          .filter((r) => r.categoria === "Equipo")
          .map((r) => ({ item_id: r.item_id, nombre: r.item, cantidad: Number(r.cantidad) || 1 }))
      );
      setError(null);
    } catch (e) {
      console.error(e);
      setError("No se pudo cargar el detalle.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refreshAll();
  }, [tareaId]);

  /* ----------------------- SOCKET (LIVE) ----------------------- */
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_BASE_URL || "http://localhost:3001", {
      withCredentials: false,
    });
    socket.emit("join:tarea", tareaId);

    const onNovedad = (payload) => {
      if (!payload || String(payload.tareaId) !== String(tareaId)) return;
      if (payload.novedad) setNovedades((prev) => [payload.novedad, ...prev]);
      if (payload.estado) {
        setTarea((prev) =>
          prev ? { ...prev, estados: [payload.estado, ...(prev.estados || [])] } : prev
        );
      }
    };
    const onAnyChange = () => refreshAll();

    socket.on("tarea:novedad", onNovedad);
    socket.on("tarea:estado", onAnyChange);
    socket.on("tarea:asignaciones", onAnyChange);
    socket.on("tarea:insumos", onAnyChange);
    socket.on("tareas:update", onAnyChange);

    return () => {
      socket.emit("leave:tarea", tareaId);
      socket.off("tarea:novedad", onNovedad);
      socket.off("tarea:estado", onAnyChange);
      socket.off("tarea:asignaciones", onAnyChange);
      socket.off("tarea:insumos", onAnyChange);
      socket.off("tareas:update", onAnyChange);
      socket.disconnect();
    };
  }, [tareaId]);

  /* ----------------------- ACCIONES ----------------------- */
  const addNovedad = async () => {
    const text = textoNovedad.trim();
    if (!text) return;
    try {
      setTextoNovedad("");
      await crearNovedadTarea(tareaId, { texto: text });
      toast.success("Novedad registrada ✅");
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "No se pudo registrar la novedad");
    }
  };

  const doStart = async () => {
    try {
      await iniciarTarea(tareaId, {});
      toast.success("Tarea iniciada ✅");
      await refreshAll();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "No se pudo iniciar la tarea");
    }
  };

  const doComplete = async () => {
    try {
      await completarTarea(tareaId, { comentario: actionNote?.trim() || undefined });
      toast.success("Tarea completada ✅");
      setActionNote("");
      setActionModal({ open: false, kind: null });
      await refreshAll();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "No se pudo completar la tarea");
    }
  };

  const doVerify = async (force = false) => {
    try {
      await verificarTarea(tareaId, { comentario: actionNote?.trim() || undefined, force });
      toast.success(force ? "Verificada (forzada) ✅" : "Verificada ✅");
      setActionNote("");
      setActionModal({ open: false, kind: null });
      await refreshAll();
    } catch (e) {
      const msg = e?.response?.data?.message || "";
      if (msg.toLowerCase().includes("stock insuficiente")) {
        const ok = confirm(
          `${msg}\n\n¿Forzar verificación? Esto puede dejar stock en negativo.`
        );
        if (ok) return doVerify(true);
      }
      toast.error(msg || "No se pudo verificar");
    }
  };

  /* ----------------------- RENDER ----------------------- */
  return (
    // 👇 fuerza scroll aun si el layout padre bloquea
<section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-[100dvh] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        {/* header: volver + acción */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button onClick={() => navigate(-1)} className={btnGhost}>
            Regresar
          </button>

          {!isWorker && tarea?.estado === "Completada" && (
            <button
              onClick={() => setActionModal({ open: true, kind: "verify" })}
              className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Verificar
            </button>
          )}
        </div>

        {/* título */}
        <div className="mb-4">
          <div className="text-[11px] text-slate-500 font-mono">#{tarea?.id}</div>
          <h1 className="text-2xl font-bold text-slate-900">
            {tarea?.titulo || tarea?.tipo || "Detalle de tarea"}
          </h1>
        </div>

        {loading && <p className="mt-6 text-slate-500">Cargando…</p>}
        {error && <p className="mt-6 text-rose-600">{error}</p>}

        {!loading && tarea && (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            {/* =================== COLUMNA IZQUIERDA =================== */}
            <div className="lg:col-span-2 space-y-8">
              {/* Meta */}
              <div className="grid grid-cols-1 gap-y-4 gap-x-12 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600 inline-flex items-center gap-2">
                      <span>🏷️</span> <span className="font-medium">Lote</span>
                    </span>
                    <Chip color="yellow">{tarea?.lote || "—"}</Chip>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-600 inline-flex items-center gap-2">
                      <span>⚪</span> <span className="font-medium">Estado</span>
                    </span>
                    <Chip
                      color={
                        tarea?.estado === "Asignada"
                          ? "blue"
                          : tarea?.estado === "En progreso"
                          ? "yellow"
                          : tarea?.estado === "Completada"
                          ? "green"
                          : tarea?.estado === "Verificada"
                          ? "purple"
                          : "gray"
                      }
                    >
                      {tarea?.estado || "—"}
                    </Chip>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600 inline-flex items-center gap-2">
                      <span>👥</span> <span className="font-medium">Asignados</span>
                    </span>
                    <div className="flex -space-x-2">
                      {(tarea?.asignaciones || []).slice(0, 3).map((a) => (
                        <div
                          key={a.id}
                          title={a.usuario?.nombre}
                          className={`h-8 w-8 rounded-full border border-white flex items-center justify-center text-[11px] font-semibold ${avatarColorFor(
                            a?.usuario?.nombre || ""
                          )}`}
                        >
                          {initials(a?.usuario?.nombre)}
                        </div>
                      ))}
                      {(tarea?.asignaciones || []).length === 0 && (
                        <span className="text-slate-500">—</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-600 inline-flex items-center gap-2">
                      <span>🕒</span> <span className="font-medium">Fecha</span>
                    </span>
                    <span className="font-medium">{fmtDT(tarea?.fecha_programada)}</span>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <section>
                <h3 className="font-semibold mb-1 text-slate-800">Descripción</h3>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {tarea.descripcion || "—"}
                </p>
              </section>

              {/* Recursos */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">
                    Insumos y herramientas de la tarea
                  </h3>
                  {canEdit && (
                    <button onClick={() => setEditInsumosOpen(true)} className={btnPrimary}>
                      Editar insumos / requerimientos
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <div className="text-sm font-medium mb-1">Herramientas requeridas</div>
                    {herramientasReq?.length ? (
                      <ul className="list-disc pl-5 text-sm text-slate-800">
                        {herramientasReq.map((h, idx) => (
                          <li key={`h-${h.item_id || idx}`}>{h.nombre}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-slate-500">—</div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">Equipos requeridos</div>
                    {equiposReq?.length ? (
                      <ul className="list-disc pl-5 text-sm text-slate-800">
                        {equiposReq.map((e, idx) => (
                          <li key={`e-${e.item_id || idx}`}>{e.nombre}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-slate-500">—</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-1">Insumos asignados</div>
                  {insumos.length ? (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="p-2 text-left font-medium">Insumo</th>
                            <th className="p-2 text-right font-medium">Cant.</th>
                            <th className="p-2 text-left font-medium">Unidad</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {insumos.map((i) => (
                            <tr key={i.item_id} className="bg-white">
                              <td className="p-2 text-slate-900">{i.item}</td>
                              <td className="p-2 text-right text-slate-700">
                                {Number(i.cantidad).toLocaleString()}
                              </td>
                              <td className="p-2 text-slate-700">{i.unidad}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">—</div>
                  )}
                </div>
              </section>

              {/* Novedades */}
              <section className="space-y-2">
                <h3 className="font-semibold text-slate-800">Novedades</h3>

                {novedades.length ? (
                  <ul className="space-y-3">
                    {novedades.map((n) => (
                      <li key={n.id} className="rounded-2xl border border-slate-200 p-3 bg-white">
                        <div className="flex items-start gap-3">
 <Avatar
  name={n.autor?.nombre || ""}
  size={36}
  className="h-9 w-9"
/>

                          <div className="flex-1">
                            <div className="text-sm text-slate-900">
                              <span className="font-medium">{n.autor?.nombre || "—"}</span>
                              <span className="text-slate-500"> | {fmtDT(n.created_at)}</span>
                            </div>
                            <div className="text-sm mt-1 text-slate-800">{n.texto}</div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-slate-500">Sin novedades</div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-white">
                  <textarea
                    rows={3}
                    value={textoNovedad}
                    onChange={(e) => setTextoNovedad(e.target.value)}
                    placeholder="Escribe una novedad…"
                    className={`${textareaBase} rounded-2xl border-0`}
                  />
                  <div className="flex justify-end p-2">
                    <button onClick={addNovedad} className={btnPrimary}>
                      Enviar novedad
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* =================== COLUMNA DERECHA =================== */}
            <div className="space-y-6">
              {/* Acciones del trabajador */}
              {isWorker && (
                <section className="rounded-2xl border border-slate-200 p-4 bg-white">
                  <h4 className="font-semibold mb-2 text-slate-800">Acciones</h4>
                  <div className="flex flex-wrap gap-2">
                    {(tarea?.estado === "Pendiente" || tarea?.estado === "Asignada") && (
                      <button
                        onClick={doStart}
                        className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700"
                      >
                        Iniciar tarea
                      </button>
                    )}
                    {tarea?.estado === "En progreso" && (
                      <button
                        onClick={() => setActionModal({ open: true, kind: "complete" })}
                        className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        Completar tarea
                      </button>
                    )}
                  </div>
                </section>
              )}

              {/* Asignados */}
              <section className="rounded-2xl border border-slate-200 p-4 bg-white">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-semibold text-slate-800">Trabajadores asignados</h4>
                  {canEdit && (
                    <button onClick={() => setAsignModalOpen(true)} className={btnPrimary}>
                      Editar
                    </button>
                  )}
                </div>
                {(tarea?.asignaciones || []).length ? (
                  <ul className="text-sm space-y-1 text-slate-800">
                    {tarea.asignaciones.map((a) => (
                      <li key={a.id}>
                        • {a.usuario?.nombre}{" "}
                        <span className="text-slate-500">({a.rol_en_tarea})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-slate-500">Sin asignaciones</div>
                )}
              </section>

              {/* Actividad con Avatar en el timeline */}
              <section className="rounded-2xl border border-slate-200 p-4 bg-white">
                <h4 className="mb-3 font-semibold text-slate-800">Historial de actividad</h4>
                {tarea.estados?.length ? (
<ol className="relative ml-4 ps-4 space-y-4 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-slate-200">                    {[...tarea.estados].reverse().map((e, idx) => {
                      const name = e.usuario?.nombre || "";
                      return (
                        <li key={idx} className="relative">
                          <div className="absolute -left-4 top-0">
                            <div className="absolute -left-4 top-0">
  <Avatar
    name={name}
    size={28}
    className="h-7 w-7"
/>
</div>

                          </div>
                          <div className="text-sm">
                            <span className="font-medium">{e.estado}</span>{" "}
                            <span className="text-slate-500">— {fmtDT(e.fecha)}</span>
                          </div>
                          {e.comentario && (
                            <div className="text-sm italic text-slate-700">{e.comentario}</div>
                          )}
                          {name && <div className="text-[11px] text-slate-500">{name}</div>}
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <div className="text-sm text-slate-500">Sin actividad</div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>

      {/* Modales desacoplados */}
      <InsumosRequerimientosModal
        tareaId={tareaId}
        open={canEdit && editInsumosOpen}
        onClose={() => setEditInsumosOpen(false)}
        onSaved={refreshAll}
      />
      <AsignacionesModal
        tareaId={tareaId}
        open={canEdit && asignModalOpen}
        onClose={() => setAsignModalOpen(false)}
        onSaved={refreshAll}
      />

      {/* Modal unificado completar / verificar (móvil full-screen con scroll propio) */}
      {actionModal.open && (
        <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-[1px] p-0 sm:p-4 flex sm:items-center sm:justify-center">
          <div
            ref={actionPanelRef}
            className={[
              "w-full max-w-none sm:max-w-[min(560px,calc(100vw-1rem))]",
              "h-[100dvh] sm:h-auto sm:max-h-[calc(100dvh-2rem)]",
              "rounded-none sm:rounded-2xl sm:border border-slate-200 bg-white shadow-[0_24px_60px_rgba(0,0,0,.18)]",
              "grid grid-rows-[auto,1fr,auto] overflow-hidden",
            ].join(" ")}
          >
            <div className="px-4 sm:px-6 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {actionModal.kind === "verify" ? "Verificar tarea" : "Completar tarea"}
              </h3>
              <button
                onClick={() => setActionModal({ open: false, kind: null })}
                className="inline-flex h-9 px-3 items-center justify-center rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            <div
              className="min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <p className="text-sm text-slate-600 mb-3">
                Puedes agregar un comentario (opcional). Se mostrará en el historial de actividad.
              </p>
              <textarea
                rows={6}
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="Escribe un comentario… (opcional)"
                className={textareaBase}
              />
            </div>

            <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-white">
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setActionModal({ open: false, kind: null })}
                  className={btnGhost}
                >
                  Cancelar
                </button>
                {actionModal.kind === "verify" ? (
                  <button
                    onClick={() => doVerify(false)}
                    className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                  >
                    Verificar
                  </button>
                ) : (
                  <button onClick={doComplete} className={btnPrimary}>
                    Completar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
