// src/components/TaskActionModal.jsx
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { completarTarea, verificarTarea } from "../api/apiClient";

const textareaBase =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";
const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-700";
const btnGhost =
  "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";

export default function TaskActionModal({
  open,
  kind,          // "complete" | "verify"
  tarea,         // objeto tarea completo
  onClose,
  onDone,        // callback para refrescar (refreshAll)
}) {
  const panelRef = useRef(null);
  const [comentario, setComentario] = useState("");
  const [detalleValues, setDetalleValues] = useState({});

  const isComplete = kind === "complete";
  const isVerify = kind === "verify";

useEffect(() => {
  if (!open) {
    setComentario("");
    setDetalleValues({});
  }
}, [open, kind, tarea?.id]);

  if (!open || !kind || !tarea) return null;

  const tipo = tarea.tipo_codigo;

  const handleConfirm = async () => {
    try {
      if (isComplete) {
  const body = {
    comentario: comentario?.trim() || undefined,
  };
  const detalle = {};

  if (tipo === "poda") {
    const v = Number(detalleValues.porcentaje_plantas_real_pct);
    if (Number.isNaN(v)) {
      toast.error("Ingresa el porcentaje real de plantas intervenidas");
      return;
    }
    detalle.porcentaje_plantas_real_pct = v;

    if (typeof detalleValues.herramientas_desinfectadas === "boolean") {
      detalle.herramientas_desinfectadas =
        detalleValues.herramientas_desinfectadas;
    }
  } else if (tipo === "maleza") {
    const v = Number(detalleValues.cobertura_real_pct);
    if (Number.isNaN(v)) {
      toast.error("Ingresa la cobertura real intervenida en %");
      return;
    }
    detalle.cobertura_real_pct = v;
  } else if (tipo === "enfundado") {
    const vPct = Number(detalleValues.porcentaje_frutos_real_pct);
    if (Number.isNaN(vPct)) {
      toast.error("Ingresa el porcentaje real de frutos enfundados");
      return;
    }
    detalle.porcentaje_frutos_real_pct = vPct;

    if (detalleValues.frutos_enfundados_real !== undefined &&
        detalleValues.frutos_enfundados_real !== "") {
      const vNum = Number(detalleValues.frutos_enfundados_real);
      if (Number.isNaN(vNum)) {
        toast.error("Ingresa un número válido de frutos enfundados reales");
        return;
      }
      detalle.frutos_enfundados_real = vNum;
    }
  } else if (tipo === "nutricion") {
    const v = Number(detalleValues.porcentaje_plantas_real_pct);
    if (Number.isNaN(v)) {
      toast.error("Ingresa el % real de plantas fertilizadas");
      return;
    }
    detalle.porcentaje_plantas_real_pct = v;
  } else if (tipo === "fitosanitario") {
    const v = Number(detalleValues.porcentaje_plantas_real_pct);
    if (Number.isNaN(v)) {
      toast.error("Ingresa el % real tratado en fitosanitario");
      return;
    }
    detalle.porcentaje_plantas_real_pct = v;
  } else if (tipo === "cosecha") {
  const vKg = Number(detalleValues.kg_cosechados);
  if (Number.isNaN(vKg)) {
    toast.error("Ingresa los kg cosechados reales");
    return;
  }
  detalle.kg_cosechados = vKg;

  const vMad = Number(detalleValues.grado_madurez);
  if (Number.isNaN(vMad)) {
    toast.error("Ingresa el grado de madurez (0-10)");
    return;
  }
  detalle.grado_madurez = vMad;
}


    if (Object.keys(detalle).length > 0) {
      body.detalle = detalle;
    }

    await completarTarea(tarea.id, body);
    toast.success("Tarea completada ✅");
  }


        
      else if (isVerify) {
        const baseBody = {
          comentario: comentario?.trim() || undefined,
        };

        try {
          await verificarTarea(tarea.id, baseBody);
          toast.success("Verificada ✅");
        } catch (e) {
          const msg = e?.response?.data?.message || "";
          if (msg.toLowerCase().includes("stock insuficiente")) {
            const ok = window.confirm(
              `${msg}\n\n¿Forzar verificación? Esto puede dejar stock en negativo.`
            );
            if (ok) {
              await verificarTarea(tarea.id, {
                ...baseBody,
                force: true,
              });
              toast.success("Verificada (forzada) ✅");
            } else {
              throw e;
            }
          } else {
            throw e;
          }
        }
      }

      onClose?.();
      await onDone?.();
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.message ||
        (isComplete
          ? "No se pudo completar la tarea"
          : "No se pudo verificar la tarea");
      toast.error(msg);
    }
  };

const renderMetricField = () => {
  if (!isComplete) return null;

  const tipo = tarea.tipo_codigo;

  // PODA
  if (tipo === "poda") {
    const d = tarea.poda || {};
    return (
      <div className="mb-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Porcentaje real de plantas intervenidas (%)
          </label>
          {d.porcentaje_plantas_plan_pct != null && (
            <p className="text-xs text-slate-500 mb-1">
              Planificado:{" "}
              <strong>
                {Number(d.porcentaje_plantas_plan_pct).toFixed(1)}%
              </strong>
            </p>
          )}
          <input
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={detalleValues.porcentaje_plantas_real_pct ?? ""}
            onChange={(e) =>
              setDetalleValues((prev) => ({
                ...prev,
                porcentaje_plantas_real_pct: e.target.value,
              }))
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Ej: 90"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="herr_desinf"
            type="checkbox"
            checked={!!detalleValues.herramientas_desinfectadas}
            onChange={(e) =>
              setDetalleValues((prev) => ({
                ...prev,
                herramientas_desinfectadas: e.target.checked,
              }))
            }
          />
          <label
            htmlFor="herr_desinf"
            className="text-sm text-slate-700 select-none"
          >
            Herramientas desinfectadas al finalizar la tarea
          </label>
        </div>
      </div>
    );
  }

  // MALEZA
  if (tipo === "maleza") {
    const d = tarea.manejoMaleza || {};
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Cobertura real intervenida (%)
        </label>
        {d.cobertura_planificada_pct != null && (
          <p className="text-xs text-slate-500 mb-1">
            Planificado:{" "}
            <strong>
              {Number(d.cobertura_planificada_pct).toFixed(1)}%
            </strong>
          </p>
        )}
        <input
          type="number"
          min={0}
          max={100}
          step="0.1"
          value={detalleValues.cobertura_real_pct ?? ""}
          onChange={(e) =>
            setDetalleValues((prev) => ({
              ...prev,
              cobertura_real_pct: e.target.value,
            }))
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="Ej: 80"
        />
      </div>
    );
  }

  // ENFUNDADO
  if (tipo === "enfundado") {
    const d = tarea.enfundado || {};
    return (
      <div className="mb-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Frutos enfundados reales (unidades)
          </label>
          {d.frutos_enfundados_plan != null && (
            <p className="text-xs text-slate-500 mb-1">
              Planificado:{" "}
              <strong>{Number(d.frutos_enfundados_plan)}</strong>
            </p>
          )}
          <input
            type="number"
            min={0}
            step="1"
            value={detalleValues.frutos_enfundados_real ?? ""}
            onChange={(e) =>
              setDetalleValues((prev) => ({
                ...prev,
                frutos_enfundados_real: e.target.value,
              }))
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Ej: 120"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Porcentaje real de frutos enfundados (%)
          </label>
          {d.porcentaje_frutos_plan_pct != null && (
            <p className="text-xs text-slate-500 mb-1">
              Planificado:{" "}
              <strong>
                {Number(d.porcentaje_frutos_plan_pct).toFixed(1)}%
              </strong>
            </p>
          )}
          <input
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={detalleValues.porcentaje_frutos_real_pct ?? ""}
            onChange={(e) =>
              setDetalleValues((prev) => ({
                ...prev,
                porcentaje_frutos_real_pct: e.target.value,
              }))
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Ej: 95"
          />
        </div>
      </div>
    );
  }

  // NUTRICIÓN
  if (tipo === "nutricion") {
    const d = tarea.nutricion || {};
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Porcentaje real de plantas tratadas (%)
        </label>
        {d.porcentaje_plantas_plan_pct != null && (
          <p className="text-xs text-slate-500 mb-1">
            Planificado:{" "}
            <strong>
              {Number(d.porcentaje_plantas_plan_pct).toFixed(1)}%
            </strong>
          </p>
        )}
        <input
          type="number"
          min={0}
          max={100}
          step="0.1"
          value={detalleValues.porcentaje_plantas_real_pct ?? ""}
          onChange={(e) =>
            setDetalleValues((prev) => ({
              ...prev,
              porcentaje_plantas_real_pct: e.target.value,
            }))
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="Ej: 85"
        />
      </div>
    );
  }

  // FITOSANITARIO
  if (tipo === "fitosanitario") {
    const d = tarea.fitosanitario || {};
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          % real de plantas/área tratada
        </label>
        {d.porcentaje_plantas_plan_pct != null && (
          <p className="text-xs text-slate-500 mb-1">
            Planificado:{" "}
            <strong>
              {Number(d.porcentaje_plantas_plan_pct).toFixed(1)}%
            </strong>
          </p>
        )}
        <input
          type="number"
          min={0}
          max={100}
          step="0.1"
          value={detalleValues.porcentaje_plantas_real_pct ?? ""}
          onChange={(e) =>
            setDetalleValues((prev) => ({
              ...prev,
              porcentaje_plantas_real_pct: e.target.value,
            }))
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="Ej: 75"
        />
      </div>
    );
  }


// COSECHA
if (tipo === "cosecha") {
  const c = tarea.tareaCosecha || {};
  const kgPlan = c.kg_planificados != null ? Number(c.kg_planificados) : null;

  return (
    <div className="mb-4 space-y-4">

      {/* KG cosechados reales */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Kg cosechados reales (kg)
        </label>
        {kgPlan != null && (
          <p className="text-xs text-slate-500 mb-1">
            Planificado: <strong>{kgPlan.toFixed(2)} kg</strong>
          </p>
        )}
        <input
          type="number"
          min={0}
          step="0.01"
          value={detalleValues.kg_cosechados ?? ""}
          onChange={(e) =>
            setDetalleValues((prev) => ({
              ...prev,
              kg_cosechados: e.target.value,
            }))
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="Ej: 540.25"
        />
      </div>

      {/* GRADO DE MADUREZ */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Grado de madurez (0–10)
        </label>
        <input
          type="number"
          min={0}
          max={10}
          step="0.1"
          value={detalleValues.grado_madurez ?? ""}
          onChange={(e) =>
            setDetalleValues((prev) => ({
              ...prev,
              grado_madurez: e.target.value,
            }))
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="Ej: 4.5"
        />
        <p className="text-xs text-slate-500 mt-1">
          Este valor corresponde a la escala visual de madurez utilizada por INIAP.
        </p>
      </div>

    </div>
  );
}


  // Otros tipos
  return null;
};


  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-[1px] p-0 sm:p-4 flex sm:items-center sm:justify-center">
      <div
        ref={panelRef}
        className={[
          "w-full max-w-none sm:max-w-[min(560px,calc(100vw-1rem))]",
          "h-[100dvh] sm:h-auto sm:max-h-[calc(100dvh-2rem)]",
          "rounded-none sm:rounded-2xl sm:border border-slate-200 bg-white shadow-[0_24px_60px_rgba(0,0,0,.18)]",
          "grid grid-rows-[auto,1fr,auto] overflow-hidden",
        ].join(" ")}
      >
        {/* header */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            {isVerify ? "Verificar tarea" : "Completar tarea"}
          </h3>
          <button onClick={onClose} className={btnGhost}>
            Cerrar
          </button>
        </div>

        {/* body */}
        <div
          className="min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {isComplete && renderMetricField()}

          <p className="text-sm text-slate-600 mb-2">
            Puedes agregar un comentario (opcional). Se mostrará en el historial de
            actividad.
          </p>
          <textarea
            rows={6}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Escribe un comentario… (opcional)"
            className={textareaBase}
          />
        </div>

        {/* footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-white">
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className={btnGhost}>
              Cancelar
            </button>
            <button onClick={handleConfirm} className={btnPrimary}>
              {isVerify ? "Verificar" : "Completar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
