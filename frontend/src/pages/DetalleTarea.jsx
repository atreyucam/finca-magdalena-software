// src/pages/TaskDetailPage.jsx
import { useEffect, useMemo, useState } from "react";
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

/* ----------------------- Utilidades UI ----------------------- */
const fmtDT = (v) => (v ? new Date(v).toLocaleString() : "—");
const initials = (name = "") =>
  name.split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

function Chip({ children, color = "blue" }) {
  const map = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    gray: "bg-gray-50 text-gray-700 border-gray-200",
  };
  return <span className={`px-2 py-0.5 rounded border text-xs ${map[color] || map.blue}`}>{children}</span>;
}

/* ======================== PAGE ======================== */
export default function TaskDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const tareaId = Number(id);

  // rol
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

  // ✅ modal unificado para completar / verificar
  const [actionModal, setActionModal] = useState({ open: false, kind: null }); // 'complete' | 'verify'
  const [actionNote, setActionNote] = useState("");

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
      setReqHerr(reqs.filter(r => r.categoria === "Herramienta").map(r => ({
        item_id: r.item_id, nombre: r.item, cantidad: Number(r.cantidad) || 1
      })));
      setReqEq(reqs.filter(r => r.categoria === "Equipo").map(r => ({
        item_id: r.item_id, nombre: r.item, cantidad: Number(r.cantidad) || 1
      })));

      setError(null);
    } catch (e) {
      console.error(e);
      setError("No se pudo cargar el detalle.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { refreshAll(); }, [tareaId]);

  /* ----------------------- SOCKET (LIVE) ----------------------- */
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_BASE_URL || "http://localhost:3001", { withCredentials: false });
    socket.emit("join:tarea", tareaId);

    const onNovedad = (payload) => {
      if (!payload || String(payload.tareaId) !== String(tareaId)) return;
      if (payload.novedad) setNovedades((prev) => [payload.novedad, ...prev]);
      if (payload.estado) {
        setTarea((prev) => prev ? { ...prev, estados: [payload.estado, ...(prev.estados || [])] } : prev);
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

  // ✅ verificar usando el mismo modal
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
        const ok = confirm(`${msg}\n\n¿Forzar verificación? Esto puede dejar stock en negativo.`);
        if (ok) return doVerify(true);
      }
      toast.error(msg || "No se pudo verificar");
    }
  };

  /* ----------------------- RENDER ----------------------- */
  return (
    <div className="px-4 md:px-6 lg:px-10 py-5">
      {/* header: volver + acción */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-sm">
          Regresar
        </button>

        {/* Botón Verificar (solo técnico/admin) -> abre el MISMO modal */}
        {!isWorker && tarea?.estado === "Completada" && (
          <button
            onClick={() => setActionModal({ open: true, kind: "verify" })}
            className="px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
          >
            Verificar
          </button>
        )}
      </div>

      {/* título */}
      <div className="mb-1">
        <div className="text-xs text-gray-500 font-mono">#{tarea?.id}</div>
        <h1 className="text-2xl font-bold">{tarea?.titulo || tarea?.tipo || "Detalle de tarea"}</h1>
      </div>

      {loading && <p className="mt-6 text-gray-500">Cargando…</p>}
      {error && <p className="mt-6 text-red-500">{error}</p>}

      {!loading && tarea && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-2">
          {/* =================== COLUMNA IZQUIERDA =================== */}
          <div className="lg:col-span-2 space-y-8">
            {/* Meta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 mb-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 inline-flex items-center gap-2"><span>🏷️</span> <span className="font-medium">Lote</span></span>
                  <Chip color="yellow">{tarea?.lote || "—"}</Chip>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-gray-600 inline-flex items-center gap-2"><span>⚪</span> <span className="font-medium">Estado</span></span>
                  <Chip color={
                    tarea?.estado === "Asignada" ? "blue" :
                    tarea?.estado === "En progreso" ? "yellow" :
                    tarea?.estado === "Completada" ? "green" :
                    tarea?.estado === "Verificada" ? "purple" : "gray"
                  }>
                    {tarea?.estado || "—"}
                  </Chip>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 inline-flex items-center gap-2"><span>👥</span> <span className="font-medium">Asignados</span></span>
                  <div className="flex -space-x-2">
                    {(tarea?.asignaciones || []).slice(0, 3).map((a) => (
                      <div key={a.id} title={a.usuario?.nombre}
                        className="w-8 h-8 rounded-full bg-blue-100 border border-white flex items-center justify-center text-[11px] font-semibold text-blue-700">
                        {initials(a?.usuario?.nombre)}
                      </div>
                    ))}
                    {(tarea?.asignaciones || []).length === 0 && <span className="text-gray-500">—</span>}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-gray-600 inline-flex items-center gap-2"><span>🕒</span> <span className="font-medium">Fecha</span></span>
                  <span className="font-medium">{fmtDT(tarea?.fecha_programada)}</span>
                </div>
              </div>
            </div>

            {/* Descripción */}
            <section>
              <h3 className="font-semibold mb-1">Descripción</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{tarea.descripcion || "—"}</p>
            </section>

            {/* Recursos */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Insumos y herramientas de la tarea</h3>
                {canEdit && (
                  <button onClick={() => setEditInsumosOpen(true)} className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                    Editar insumos / requerimientos
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-medium mb-1">Herramientas requeridas</div>
                  {reqHerr.length ? (
                    <ul className="list-disc pl-5 text-sm">
                      {reqHerr.map((h) => (<li key={`h-${h.item_id}`}>{h.nombre} {h.cantidad ? `× ${h.cantidad}` : ""}</li>))}
                    </ul>
                  ) : (<div className="text-sm text-gray-500">—</div>)}
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Equipos requeridos</div>
                  {reqEq.length ? (
                    <ul className="list-disc pl-5 text-sm">
                      {reqEq.map((e) => (<li key={`e-${e.item_id}`}>{e.nombre} {e.cantidad ? `× ${e.cantidad}` : ""}</li>))}
                    </ul>
                  ) : (<div className="text-sm text-gray-500">—</div>)}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-1">Insumos asignados</div>
                {insumos.length ? (
                  <table className="w-full text-sm border rounded">
                    <thead className="bg-gray-50">
                      <tr><th className="text-left p-2">Insumo</th><th className="text-right p-2">Cant.</th><th className="text-left p-2">Unidad</th></tr>
                    </thead>
                    <tbody>
                      {insumos.map((i) => (
                        <tr key={i.item_id} className="border-t">
                          <td className="p-2">{i.item}</td>
                          <td className="p-2 text-right">{Number(i.cantidad).toLocaleString()}</td>
                          <td className="p-2">{i.unidad}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (<div className="text-sm text-gray-500">—</div>)}
              </div>
            </section>

            {/* Novedades */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Novedades</h3>
              </div>

              {novedades.length ? (
                <ul className="space-y-3">
                  {novedades.map((n) => (
                    <li key={n.id} className="border rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 border flex items-center justify-center text-[11px] font-semibold text-gray-700">
                          {initials(n.autor?.nombre || "")}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-gray-900">
                            <span className="font-medium">{n.autor?.nombre || "—"}</span>
                            <span className="text-gray-500"> | {fmtDT(n.created_at)}</span>
                          </div>
                          <div className="text-sm mt-1">{n.texto}</div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (<div className="text-sm text-gray-500">Sin novedades</div>)}

              {/* composer */}
              <div className="border rounded-xl overflow-hidden">
                <textarea rows={3} value={textoNovedad} onChange={(e) => setTextoNovedad(e.target.value)}
                  placeholder="Escribe una novedad…" className="w-full p-3 outline-none resize-y" />
                <div className="flex justify-end p-2">
                  <button onClick={addNovedad} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm">
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
              <section className="border rounded-2xl p-4">
                <h4 className="font-semibold mb-2">Acciones</h4>
                <div className="flex flex-wrap gap-2">
                  {(tarea?.estado === "Pendiente" || tarea?.estado === "Asignada") && (
                    <button onClick={doStart} className="px-3 py-1.5 rounded bg-amber-600 text-white hover:bg-amber-700 text-sm">
                      Iniciar tarea
                    </button>
                  )}
                  {tarea?.estado === "En progreso" && (
                    <button onClick={() => setActionModal({ open: true, kind: "complete" })}
                      className="px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 text-sm">
                      Completar tarea
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* Asignados */}
            <section className="border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Trabajadores asignados</h4>
                {canEdit && (
                  <button onClick={() => setAsignModalOpen(true)}
                    className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm">
                    Editar
                  </button>
                )}
              </div>
              {(tarea?.asignaciones || []).length ? (
                <ul className="text-sm space-y-1">
                  {tarea.asignaciones.map((a) => (
                    <li key={a.id}>• {a.usuario?.nombre} <span className="text-gray-500">({a.rol_en_tarea})</span></li>
                  ))}
                </ul>
              ) : (<div className="text-sm text-gray-500">Sin asignaciones</div>)}
            </section>

            {/* Actividad (NO modificar) */}
            <section className="border rounded-2xl p-4">
              <h4 className="font-semibold mb-3">Historial de actividad</h4>
              {tarea.estados?.length ? (
                <ol className="relative border-s ml-2 ps-4 space-y-4">
                  {[...tarea.estados].reverse().map((e, idx) => (
                    <li key={idx}>
                      <div className="absolute -start-1.5 rounded-full bg-blue-600 w-2 h-2 mt-2" />
                      <div className="text-sm">
                        <span className="font-medium">{e.estado}</span>{" "}
                        <span className="text-gray-500">— {fmtDT(e.fecha)}</span>
                      </div>
                      {e.comentario && (<div className="text-sm italic text-gray-700">{e.comentario}</div>)}
                      {e.usuario?.nombre && (<div className="text-[11px] text-gray-500">{e.usuario.nombre}</div>)}
                    </li>
                  ))}
                </ol>
              ) : (<div className="text-sm text-gray-500">Sin actividad</div>)}
            </section>
          </div>
        </div>
      )}

      {/* Modales desacoplados (solo no-trabajador puede abrirlos) */}
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

      {/* ✅ Modal unificado para completar / verificar */}
      {actionModal.open && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg">
                {actionModal.kind === "verify" ? "Verificar tarea" : "Completar tarea"}
              </h3>
              <button onClick={() => setActionModal({ open: false, kind: null })}
                className="px-2 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200">Cerrar</button>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Puedes agregar un comentario (opcional). Se mostrará en el historial de actividad.
            </p>
            <textarea
              rows={4}
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder="Escribe un comentario… (opcional)"
              className="w-full border rounded p-2 text-sm"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setActionModal({ open: false, kind: null })}
                className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-sm"
              >
                Cancelar
              </button>
              {actionModal.kind === "verify" ? (
                <button onClick={() => doVerify(false)}
                  className="px-3 py-1.5 rounded bg-purple-600 text-white hover:bg-purple-700 text-sm">
                  Verificar
                </button>
              ) : (
                <button onClick={doComplete}
                  className="px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 text-sm">
                  Completar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
