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
  const [metricValue, setMetricValue] = useState("");

  const isComplete = kind === "complete";
  const isVerify = kind === "verify";

  useEffect(() => {
    if (!open) {
      setComentario("");
      setMetricValue("");
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
          if (metricValue === "" || isNaN(Number(metricValue))) {
            toast.error("Ingresa el porcentaje real de plantas intervenidas");
            return;
          }
          detalle.porcentaje_plantas_real_pct = Number(metricValue);
        } else if (tipo === "maleza") {
          if (metricValue === "" || isNaN(Number(metricValue))) {
            toast.error("Ingresa la cobertura real intervenida en %");
            return;
          }
          detalle.cobertura_real_pct = Number(metricValue);
        } else if (tipo === "enfundado") {
          if (metricValue === "" || isNaN(Number(metricValue))) {
            toast.error("Ingresa el porcentaje real de frutos enfundados");
            return;
          }
          detalle.porcentaje_frutos_real_pct = Number(metricValue);
        } else if (tipo === "nutricion") {
          if (metricValue === "" || isNaN(Number(metricValue))) {
            toast.error("Ingresa el % real de plantas tratadas");
            return;
          }
          detalle.porcentaje_plantas_real_pct = Number(metricValue);
        } else if (tipo === "fitosanitario") {
          if (metricValue === "" || isNaN(Number(metricValue))) {
            toast.error("Ingresa el % real tratado en fitosanitario");
            return;
          }
          detalle.porcentaje_plantas_real_pct = Number(metricValue);
        }




        if (Object.keys(detalle).length > 0) {
          body.detalle = detalle;
        }

        await completarTarea(tarea.id, body);
        toast.success("Tarea completada ✅");
      } else if (isVerify) {
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

    if (tipo === "poda") {
      const d = tarea.poda || {};
      return (
        <div className="mb-4">
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
            value={metricValue}
            onChange={(e) => setMetricValue(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Ej: 90"
          />
        </div>
      );
    }

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
            value={metricValue}
            onChange={(e) => setMetricValue(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Ej: 80"
          />
        </div>
      );
    }

    if (tipo === "enfundado") {
      const d = tarea.enfundado || {};
      return (
        <div className="mb-4">
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
            value={metricValue}
            onChange={(e) => setMetricValue(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Ej: 95"
          />
        </div>
      );
    }

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
        value={metricValue}
        onChange={(e) => setMetricValue(e.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
        placeholder="Ej: 85"
      />
    </div>
  );
}

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
        value={metricValue}
        onChange={(e) => setMetricValue(e.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
        placeholder="Ej: 75"
      />
    </div>
  );
}



    // Para otros tipos (nutrición, fitosanitario, cosecha) no pedimos % aquí
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
