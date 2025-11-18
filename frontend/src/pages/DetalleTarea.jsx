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
  iniciarTarea,
} from "../api/apiClient";
import TareasItemsModal from "../components/tareaItemsModal";
import AsignacionesModal from "../components/AsignacionesModal";
import Avatar from "../components/Avatar";
import TaskActionModal from "../components/TaskActionModal";
import CosechaClasificacionModal from "../components/CosechaClasificacionModal";

const fmtDT = (v) => (v ? new Date(v).toLocaleString() : "—");

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

const textareaBase =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";
const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-700";
const btnGhost =
  "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";

export default function TaskDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const tareaId = Number(id);

  // ====== AUTH / ROLE ======
  const authStore = useAuthStore((s) => s);
  const user = authStore.user;

  const role = (() => {
    const raw =
      authStore.getRole?.() ??
      user?.role ??
      user?.rol ??
      user?.Role ??
      "";

    if (typeof raw === "string") return raw.trim();
    if (raw && typeof raw === "object") {
      return (raw.nombre || raw.name || "").trim();
    }
    return "";
  })();

  const currentUserId = user?.id || null;

  const isOwner = role === "Propietario";
  const isTech = role === "Tecnico";
  const isWorker = role === "Trabajador";
  const canEdit = isOwner || isTech;

  // ====== STATE ======
  const [loading, setLoading] = useState(true);
  const [tarea, setTarea] = useState(null);
  const [error, setError] = useState(null);

  const [editInsumosOpen, setEditInsumosOpen] = useState(false);
  const [asignModalOpen, setAsignModalOpen] = useState(false);

  const [actionModal, setActionModal] = useState({ open: false, kind: null });

  const [novedades, setNovedades] = useState([]);
  const [textoNovedad, setTextoNovedad] = useState("");
  const [cosechaModalOpen, setCosechaModalOpen] = useState(false);


  // items unificados desde backend
  const [items, setItems] = useState([]);

  // ====== DETALLES ESPECÍFICOS POR TIPO ======
  const detalles = useMemo(() => {
    if (!tarea) return null;

    switch (tarea.tipo_codigo) {
      case "poda":
        return tarea.poda;
      case "maleza":
        return tarea.manejoMaleza;
      case "nutricion":
        return tarea.nutricion;
      case "fitosanitario":
        return tarea.fitosanitario;
      case "enfundado":
        return tarea.enfundado;
      case "cosecha":
      default:
        return null;
    }
  }, [tarea]);

  // ====== ASIGNACIÓN DEL USUARIO ======
  const isAssigned = useMemo(() => {
    if (!tarea || !currentUserId) return false;

    return (tarea.asignaciones || []).some((a) => {
      const uid = a.usuario_id || a.usuario?.id;
      return Number(uid) === Number(currentUserId);
    });
  }, [tarea, currentUserId]);

  // Trabajador o Técnico ASIGNADO → puede iniciar/completar
  const canStartOrComplete = (isWorker || isTech) && isAssigned;

  // ====== LOAD / SOCKETS ======
  const refreshAll = async () => {
    try {
      setLoading(true);
      const [tRes, nRes] = await Promise.all([
        obtenerTarea(tareaId),
        listarNovedadesTarea(tareaId),
      ]);

      const t = tRes.data || null;
      setTarea(t);
      setItems(
        (t?.items || []).map((i) => ({
          ...i,
          cantidad_planificada: Number(i.cantidad_planificada) || 0,
          cantidad_real: Number(i.cantidad_real) || 0,
        }))
      );
      setNovedades(nRes.data || t?.novedades || []);
      setError(null);
    } catch (e) {
      console.error(e);
      setError("No se pudo cargar el detalle.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const scrollEl = document.querySelector(".app-scroll");

    if (scrollEl) {
      scrollEl.scrollTo({ top: 0, behavior: "instant" });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, []);

  useEffect(() => {
    if (!Number.isNaN(tareaId)) refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tareaId]);

  useEffect(() => {
    const socket = io(
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3001",
      { withCredentials: false }
    );
    socket.emit("join:tarea", tareaId);

    const onNovedad = (payload) => {
      if (!payload || String(payload.tareaId) !== String(tareaId)) return;
      if (payload.novedad) {
        setNovedades((prev) => [payload.novedad, ...prev]);
      }
      if (payload.estado) {
        setTarea((prev) =>
          prev
            ? {
                ...prev,
                estados: [payload.estado, ...(prev.estados || [])],
              }
            : prev
        );
      }
    };

    const onAnyChange = () => {
      refreshAll();
    };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tareaId]);

  // ====== ITEMS DERIVADOS ======
  const insumos = useMemo(
    () => items.filter((i) => i.categoria === "Insumo"),
    [items]
  );
  const reqHerr = useMemo(
    () => items.filter((i) => i.categoria === "Herramienta"),
    [items]
  );
  const reqEq = useMemo(
    () => items.filter((i) => i.categoria === "Equipo"),
    [items]
  );

  // ====== ACCIONES ======
  const addNovedad = async () => {
    const text = textoNovedad.trim();
    if (!text) return;
    try {
      setTextoNovedad("");
      await crearNovedadTarea(tareaId, { texto: text });
      toast.success("Novedad registrada ✅");
    } catch (e) {
      console.error(e);
      toast.error(
        e?.response?.data?.message || "No se pudo registrar la novedad"
      );
    }
  };

  const doStart = async () => {
    try {
      await iniciarTarea(tareaId, {});
      toast.success("Tarea iniciada ✅");
      await refreshAll();
    } catch (e) {
      console.error(e);
      toast.error(
        e?.response?.data?.message || "No se pudo iniciar la tarea"
      );
    }
  };

  const humanBool = (value) => {
    if (value === null || value === undefined) return "—";
    return value ? "Sí" : "No";
  };

  const fmtPct = (v) =>
    v === null || v === undefined ? "—" : `${Number(v).toFixed(1)} %`;

  const faltanteHasta100 = (real) => {
    if (real === null || real === undefined) return "—";
    const diff = 100 - Number(real);
    const val = diff < 0 ? 0 : diff;
    return `${val.toFixed(1)} %`;
  };

  const box = (label, value) => (
    <div className="flex justify-between py-1">
      <span className="text-slate-600">{label}:</span>
      <span className="font-medium text-slate-800">
        {value !== undefined && value !== null && value !== "" ? value : "—"}
      </span>
    </div>
  );

  function renderTaskDetails() {
    if (!tarea?.tipo_codigo) return null;

    const d = detalles || {};

    switch (tarea.tipo_codigo) {
      // 🌿 PODA
      case "poda":
        return (
          <>
            {box("Tipo de poda", d.tipo)}
            {box(
              "Plantas intervenidas planificado (%)",
              fmtPct(d.porcentaje_plantas_plan_pct)
            )}
            {box(
              "Plantas intervenidas real (%)",
              fmtPct(d.porcentaje_plantas_real_pct)
            )}
            {box(
              "Porcentaje faltante hasta 100%",
              faltanteHasta100(d.porcentaje_plantas_real_pct)
            )}
            {box(
              "Herramientas desinfectadas",
              humanBool(d.herramientas_desinfectadas)
            )}
            {/* {box(
              "Inicio (ejecución)",
              d.fecha_hora_inicio && fmtDT(d.fecha_hora_inicio)
            )}
            {box(
              "Fin (ejecución)",
              d.fecha_hora_fin && fmtDT(d.fecha_hora_fin)
            )} */}
          </>
        );

      // 🌱 MALEZA
      case "maleza":
        return (
          <>
            {box("Método de control", d.metodo)}
            {box(
              "Cobertura planificada (%)",
              fmtPct(d.cobertura_planificada_pct)
            )}
            {box("Cobertura real (%)", fmtPct(d.cobertura_real_pct))}
            {box(
              "Área sin intervenir (aprox.)",
              faltanteHasta100(d.cobertura_real_pct)
            )}
            {/* {box(
              "Inicio (ejecución)",
              d.fecha_hora_inicio && fmtDT(d.fecha_hora_inicio)
            )}
            {box(
              "Fin (ejecución)",
              d.fecha_hora_fin && fmtDT(d.fecha_hora_fin)
            )} */}
          </>
        );

      // 💧 NUTRICIÓN
      case "nutricion":
        return (
          <>
            {box("Método de aplicación", d.metodo_aplicacion)}
            {box(
              "% de plantas a tratar planificado",
              fmtPct(d.porcentaje_plantas_plan_pct)
            )}
            {box(
              "% de plantas tratadas real",
              fmtPct(d.porcentaje_plantas_real_pct)
            )}
            {box(
              "Plantas sin tratar (aprox.)",
              faltanteHasta100(d.porcentaje_plantas_real_pct)
            )}
            {/* {box(
              "Inicio (ejecución)",
              d.fecha_hora_inicio && fmtDT(d.fecha_hora_inicio)
            )}
            {box(
              "Fin (ejecución)",
              d.fecha_hora_fin && fmtDT(d.fecha_hora_fin)
            )} */}
          </>
        );

      // 🐛 FITOSANITARIO
      case "fitosanitario":
        return (
          <>
            {box("Plaga/enfermedad", d.plaga_enfermedad)}
            {box("Conteo umbral", d.conteo_umbral)}
            {box("Periodo de carencia (días)", d.periodo_carencia_dias)}
            {box(
              "% de plantas/área a tratar planificado",
              fmtPct(d.porcentaje_plantas_plan_pct)
            )}
            {box(
              "% de plantas/área tratada real",
              fmtPct(d.porcentaje_plantas_real_pct)
            )}
            {box(
              "Área sin tratar (aprox.)",
              faltanteHasta100(d.porcentaje_plantas_real_pct)
            )}
            {box(
              "Volumen aplicado (L)",
              d.volumen_aplicacion_lt != null
                ? Number(d.volumen_aplicacion_lt).toFixed(2)
                : "—"
            )}
            {box("Equipo de aplicación", d.equipo_aplicacion)}
            {/* {box(
              "Inicio (ejecución)",
              d.fecha_hora_inicio && fmtDT(d.fecha_hora_inicio)
            )}
            {box(
              "Fin (ejecución)",
              d.fecha_hora_fin && fmtDT(d.fecha_hora_fin)
            )} */}
          </>
        );

      // 🎒 ENFUNDADO
      case "enfundado":
        return (
          <>
            {box(
              "Frutos enfundados planificados (unidades)",
              d.frutos_enfundados_plan
            )}
            {box(
              "Frutos enfundados reales (unidades)",
              d.frutos_enfundados_real
            )}
            {box(
              "Frutos enfundados planificado (%)",
              fmtPct(d.porcentaje_frutos_plan_pct)
            )}
            {box(
              "Frutos enfundados real (%)",
              fmtPct(d.porcentaje_frutos_real_pct)
            )}
            {box(
              "Frutos sin enfundar (aprox.)",
              faltanteHasta100(d.porcentaje_frutos_real_pct)
            )}
            {/* {box(
              "Inicio (ejecución)",
              d.fecha_hora_inicio && fmtDT(d.fecha_hora_inicio)
            )}
            {box(
              "Fin (ejecución)",
              d.fecha_hora_fin && fmtDT(d.fecha_hora_fin)
            )} */}
          </>
        );

      // 🍈 COSECHA / POSCOSECHA
      case "cosecha": {
        const c = tarea.tareaCosecha || {};
        const kgPlan =
          c.kg_planificados !== null && c.kg_planificados !== undefined
            ? Number(c.kg_planificados)
            : null;
        const kgReal =
          c.kg_cosechados !== null && c.kg_cosechados !== undefined
            ? Number(c.kg_cosechados)
            : null;
        const pctCumpl =
          kgPlan && kgPlan > 0 ? (kgReal * 100) / kgPlan : null;

        const fmtKg = (v) =>
          v === null || v === undefined
            ? "—"
            : `${Number(v).toFixed(2)} kg`;

        return (
          <>
            {/* Botón para abrir modal de clasificación */}
      {(isOwner || isTech) && tarea.estado !== "Pendiente" && tarea.tareaCosecha &&(
        <div className="mb-3 flex justify-end">
          <button
            onClick={() => setCosechaModalOpen(true)}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Registrar / editar clasificación y rechazos
          </button>
        </div>
      )}




            {box("Fecha de cosecha", c.fecha_cosecha && fmtDT(c.fecha_cosecha))}
            {box("Kg planificados", fmtKg(kgPlan))}
            {box("Kg cosechados", fmtKg(kgReal))}
            {box("Cumplimiento estimado", pctCumpl != null ? fmtPct(pctCumpl) : "—")}
            {box("Grado de madurez", c.grado_madurez)}
            {box("Notas / observaciones", c.notas)}

            {c.clasificacion && c.clasificacion.length > 0 && (
              <div className="mt-3">
                <div className="text-sm font-medium text-slate-700 mb-1">
                  Clasificación por destino
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs md:text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="p-2 text-left font-medium">Destino</th>
                        <th className="p-2 text-right font-medium">
                          Gabetas
                        </th>
                        <th className="p-2 text-right font-medium">
                          Peso prom. gabeta (kg)
                        </th>
                        <th className="p-2 text-right font-medium">Kg</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {c.clasificacion.map((cl) => (
                        <tr key={cl.id}>
                          <td className="p-2 text-slate-900">
                            {cl.destino}
                          </td>
                          <td className="p-2 text-right text-slate-700">
                            {cl.gabetas}
                          </td>
                          <td className="p-2 text-right text-slate-700">
                            {cl.peso_promedio_gabeta_kg != null
                              ? Number(
                                  cl.peso_promedio_gabeta_kg
                                ).toFixed(2)
                              : "—"}
                          </td>
                          <td className="p-2 text-right text-slate-700">
                            {cl.kg != null
                              ? Number(cl.kg).toFixed(2)
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {c.rechazos && c.rechazos.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium text-slate-700 mb-1">
                  Rechazos de fruta
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs md:text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="p-2 text-left font-medium">Causa</th>
                        <th className="p-2 text-right font-medium">Kg</th>
                        <th className="p-2 text-left font-medium">
                          Observación
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {c.rechazos.map((r) => (
                        <tr key={r.id}>
                          <td className="p-2 text-slate-900">{r.causa}</td>
                          <td className="p-2 text-right text-slate-700">
                            {r.kg != null
                              ? Number(r.kg).toFixed(2)
                              : "—"}
                          </td>
                          <td className="p-2 text-slate-700">
                            {r.observacion || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        );
      }

      default:
        return (
          <div className="text-sm text-slate-500">
            Sin detalles específicos.
          </div>
        );
    }
  }

  // ====== RENDER ======
  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-[100dvh] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        {/* header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button onClick={() => navigate(-1)} className={btnGhost}>
            Regresar
          </button>

          {(isTech || isOwner) && tarea?.estado === "Completada" && (
            <button
              onClick={() => setActionModal({ open: true, kind: "verify" })}
              className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Verificar tarea
            </button>
          )}
        </div>

        {/* título */}
        <div className="mb-4">
          <div className="text-[11px] text-slate-500 font-mono">
            #{tarea?.id}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {tarea?.titulo || tarea?.tipo || "Detalle de tarea"}
          </h1>
        </div>

        {loading && <p className="mt-6 text-slate-500">Cargando…</p>}
        {error && <p className="mt-6 text-rose-600">{error}</p>}

        {!loading && tarea && (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            {/* izquierda */}
            <div className="lg:col-span-2 space-y-8">
              {/* meta */}
              <div className="grid grid-cols-1 gap-y-4 gap-x-12 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600 inline-flex items-center gap-2">
                      <span>🏷️</span>
                      <span className="font-medium">Lote</span>
                    </span>
                    <Chip color="yellow">{tarea?.lote || "—"}</Chip>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-600 inline-flex items-center gap-2">
                      <span>⚪</span>
                      <span className="font-medium">Estado</span>
                    </span>
                    <Chip
                      color={
                        tarea.estado === "Asignada"
                          ? "blue"
                          : tarea.estado === "En progreso"
                          ? "yellow"
                          : tarea.estado === "Completada"
                          ? "green"
                          : tarea.estado === "Verificada"
                          ? "purple"
                          : "gray"
                      }
                    >
                      {tarea.estado}
                    </Chip>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-600 inline-flex items-center gap-2">
                      <span>📂</span>
                      <span className="font-medium">Tipo</span>
                    </span>
                    <Chip color="gray">{tarea?.tipo || "—"}</Chip>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Creador */}
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600 inline-flex items-center gap-2">
                      <span>👤</span>
                      <span className="font-medium">Creador</span>
                    </span>
                    <span className="font-medium text-slate-800">
                      {tarea.creador?.nombre || "—"}
                    </span>
                  </div>

                  {/* Asignados */}
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600 inline-flex items-center gap-2">
                      <span>👥</span>
                      <span className="font-medium">Asignados</span>
                    </span>
                    <div className="flex -space-x-2">
                      {(tarea.asignaciones || [])
                        .slice(0, 3)
                        .map((a) => (
                          <Avatar
                            key={a.id}
                            user={a.usuario}
                            name={a.usuario?.nombre || ""}
                            size={32}
                            className="border border-white"
                          />
                        ))}
                      {(tarea.asignaciones || []).length === 0 && (
                        <span className="text-slate-500">—</span>
                      )}
                    </div>
                  </div>

                  {/* Fecha programada */}
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600 inline-flex items-center gap-2">
                      <span>🕒</span>
                      <span className="font-medium">Fecha programada</span>
                    </span>
                    <span className="font-medium">
                      {fmtDT(tarea.fecha_programada)}
                    </span>
                  </div>
                </div>
              </div>

              {/* descripción */}
              <section>
                <h3 className="font-semibold mb-1 text-slate-800">
                  Descripción
                </h3>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {tarea.descripcion || "—"}
                </p>
              </section>

              {/* recursos */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">
                    Insumos y recursos de la tarea
                  </h3>
                  {canEdit && (
                    <button
                      onClick={() => setEditInsumosOpen(true)}
                      className={btnPrimary}
                    >
                      Editar insumos / requerimientos
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* herramientas */}
                  <div>
                    <div className="text-sm font-medium mb-1">
                      Herramientas requeridas
                    </div>
                    {reqHerr.length ? (
                      <ul className="list-disc pl-5 text-sm text-slate-800">
                        {reqHerr.map((h) => (
                          <li key={h.id || `${h.item_id}-H`}>
                            {h.nombre}
                            {h.cantidad_planificada
                              ? ` (${h.cantidad_planificada})`
                              : ""}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-slate-500">—</div>
                    )}
                  </div>

                  {/* equipos */}
                  <div>
                    <div className="text-sm font-medium mb-1">
                      Equipos requeridos
                    </div>
                    {reqEq.length ? (
                      <ul className="list-disc pl-5 text-sm text-slate-800">
                        {reqEq.map((e) => (
                          <li key={e.id || `${e.item_id}-E`}>
                            {e.nombre}
                            {e.cantidad_planificada
                              ? ` (${e.cantidad_planificada})`
                              : ""}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-slate-500">—</div>
                    )}
                  </div>
                </div>

                {/* insumos */}
                <div>
                  <div className="text-sm font-medium mb-1">
                    Insumos planificados
                  </div>
                  {insumos.length ? (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="p-2 text-left font-medium">
                              Insumo
                            </th>
                            <th className="p-2 text-right font-medium">
                              Cant.
                            </th>
                            <th className="p-2 text-left font-medium">
                              Unidad
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {insumos.map((i) => (
                            <tr
                              key={i.id || `${i.item_id}-I`}
                              className="bg-white"
                            >
                              <td className="p-2 text-slate-900">
                                {i.nombre}
                              </td>
                              <td className="p-2 text-right text-slate-700">
                                {Number(
                                  i.cantidad_planificada
                                ).toLocaleString()}
                              </td>
                              <td className="p-2 text-slate-700">
                                {i.unidad}
                              </td>
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

              {/* Detalles específicos + tiempos reales */}
              <section className="space-y-3">
                <h3 className="font-semibold text-slate-800">
                  Detalles de la tarea
                </h3>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                  {/* Tiempos reales generales de la tarea */}
                  {box(
                    "Inicio real de la tarea",
                    tarea.fecha_hora_inicio_real &&
                      fmtDT(tarea.fecha_hora_inicio_real)
                  )}
                  {box(
                    "Fin real de la tarea",
                    tarea.fecha_hora_fin_real &&
                      fmtDT(tarea.fecha_hora_fin_real)
                  )}
                  {box(
                    "Duración real (minutos)",
                    tarea.duracion_real_min != null
                      ? `${Number(tarea.duracion_real_min).toFixed(1)} min`
                      : "—"
                  )}

                  <hr className="my-2 border-slate-200" />

                  {renderTaskDetails()}
                </div>
              </section>

              {/* novedades */}
              <section className="space-y-2">
                <h3 className="font-semibold text-slate-800">Novedades</h3>
                {novedades.length ? (
                  <ul className="space-y-3">
                    {novedades.map((n) => (
                      <li
                        key={n.id}
                        className="rounded-2xl border border-slate-200 p-3 bg-white"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar
                            user={n.autor}
                            name={n.autor?.nombre || ""}
                            size={36}
                            className="h-9 w-9"
                          />
                          <div className="flex-1">
                            <div className="text-sm text-slate-900">
                              <span className="font-medium">
                                {n.autor?.nombre || "—"}
                              </span>
                              <span className="text-slate-500">
                                {" "}
                                | {fmtDT(n.created_at)}
                              </span>
                            </div>
                            <div className="text-sm mt-1 text-slate-800">
                              {n.texto}
                            </div>
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

            {/* derecha */}
            <div className="space-y-6">
              {/* acciones */}
              {(canStartOrComplete || isTech || isOwner) && (
                <section className="rounded-2xl border border-slate-200 p-4 bg-white">
                  <h4 className="font-semibold mb-2 text-slate-800">
                    Acciones
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {/* Iniciar / Completar para Trabajador o Técnico ASIGNADO */}
                    {canStartOrComplete &&
                      (tarea.estado === "Pendiente" ||
                        tarea.estado === "Asignada") && (
                        <button
                          onClick={doStart}
                          className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700"
                        >
                          Iniciar tarea
                        </button>
                      )}

                    {canStartOrComplete && tarea.estado === "En progreso" && (
                      <button
                        onClick={() =>
                          setActionModal({
                            open: true,
                            kind: "complete",
                          })
                        }
                        className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        Completar tarea
                      </button>
                    )}

                    {/* Cancelar tarea para Técnico / Propietario */}
                    {(isTech || isOwner) &&
                      ["Pendiente", "Asignada", "En progreso"].includes(
                        tarea.estado
                      ) && (
                        <button
                          onClick={() =>
                            setActionModal({
                              open: true,
                              kind: "cancel",
                            })
                          }
                          className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700"
                        >
                          Cancelar tarea
                        </button>
                      )}
                  </div>
                </section>
              )}

              {/* asignados */}
              <section className="rounded-2xl border border-slate-200 p-4 bg-white">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-semibold text-slate-800">
                    Trabajadores asignados
                  </h4>
                  {canEdit && (
                    <button
                      onClick={() => setAsignModalOpen(true)}
                      className={btnPrimary}
                    >
                      Editar
                    </button>
                  )}
                </div>
                {(tarea.asignaciones || []).length ? (
                  <ul className="text-sm space-y-1 text-slate-800">
                    {tarea.asignaciones.map((a) => (
                      <li key={a.id}>
                        • {a.usuario?.nombre}{" "}
                        <span className="text-slate-500">
                          ({a.rol_en_tarea})
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-slate-500">
                    Sin asignaciones
                  </div>
                )}
              </section>

              {/* historial */}
              <section className="rounded-2xl border border-slate-200 p-4 bg-white">
                <h4 className="mb-3 font-semibold text-slate-800">
                  Historial de actividad
                </h4>
                {tarea.estados?.length ? (
                  <ol className="relative ml-4 ps-4 space-y-4 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-slate-200">
                    {tarea.estados
                      .slice()
                      .sort(
                        (a, b) => new Date(a.fecha) - new Date(b.fecha)
                      )
                      .map((e, idx) => {
                        const name = e.usuario?.nombre || "";
                        return (
                          <li key={idx} className="relative">
                            <div className="absolute -left-4 top-0">
                              <Avatar
                                user={e.usuario}
                                name={name}
                                size={28}
                                className="h-7 w-7"
                              />
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">
                                {e.estado}
                              </span>{" "}
                              <span className="text-slate-500">
                                — {fmtDT(e.fecha)}
                              </span>
                            </div>
                            {e.comentario && (
                              <div className="text-sm italic text-slate-700">
                                {e.comentario}
                              </div>
                            )}
                            {name && (
                              <div className="text-[11px] text-slate-500">
                                {name}
                              </div>
                            )}
                          </li>
                        );
                      })}
                  </ol>
                ) : (
                  <div className="text-sm text-slate-500">
                    Sin actividad
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* modales */}
        <TareasItemsModal
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
        <CosechaClasificacionModal
  tareaId={tareaId}
  open={cosechaModalOpen}
  onClose={() => setCosechaModalOpen(false)}
  onSaved={refreshAll}
  cosecha={tarea?.tareaCosecha}
/>

        <TaskActionModal
          open={actionModal.open}
          kind={actionModal.kind}
          tarea={tarea}
          onClose={() => setActionModal({ open: false, kind: null })}
          onDone={refreshAll}
        />
      </div>
    </section>
  );
}
