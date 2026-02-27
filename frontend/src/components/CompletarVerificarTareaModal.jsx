import { useEffect, useState } from "react";
import useToast from "../hooks/useToast";
import {
  CheckCircle,
  ShieldCheck,
  AlertTriangle,
  Droplets,
  Truck,
  Info,
  CloudSun,
} from "lucide-react";
import { completarTarea, verificarTarea } from "../api/apiClient";
import useAuthStore from "../store/authStore";
import VentanaModal from "./ui/VentanaModal";
import Boton from "./ui/Boton";
import Input from "./ui/Input";

/* =========================
   Componentes visuales
========================= */
const PlannedCard = ({ label, value, unit }) => (
  <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex flex-col justify-center">
    <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
      {label}
    </div>
    <div className="text-xl font-bold text-amber-900">
      {value ?? "-"}{" "}
      <span className="text-xs font-normal text-amber-800">{unit}</span>
    </div>
  </div>
);

const formatCantidad = (valor, maxDecimals = 3) => {
  const n = Number(valor ?? 0);
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("es-EC", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(n);
};

const RealInputCard = ({ label, value, onChange, unit, ...props }) => {
  const safeValue = value ?? ""; // nunca undefined/null

  return (
    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
      <label className="text-[10px] font-bold text-emerald-700 block mb-1 uppercase tracking-wider">
        {label}
      </label>

      <div className="relative">
        <input
          className="bg-white w-full rounded-lg border border-emerald-200 px-2 py-1.5 font-bold text-slate-800 text-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          value={safeValue}
          onChange={onChange}
          {...props}
        />
        {unit && (
          <span className="absolute right-3 top-2 text-xs font-bold text-emerald-400">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};

/* =========================
   Modal principal
========================= */
export default function CompletarVerificarTareaModal({
  open,
  modo,
  tarea,
  onClose,
  onRefrescar,
}) {
  const [loading, setLoading] = useState(false);
  const [comentario, setComentario] = useState("");
  const [valoresDetalle, setValoresDetalle] = useState({});
  const [valoresItems, setValoresItems] = useState({});

  const notify = useToast();
  const { user } = useAuthStore();

  const isSupervisor = ["Tecnico", "Propietario"].includes(user?.role);
  const esVerificar = modo === "verificar";
  const esCompletar = modo === "completar";

  const tipoCodigo = (
    tarea?.tipo_codigo ||
    tarea?.TipoActividad?.codigo ||
    ""
  )
    .toLowerCase()
    .trim();

  useEffect(() => {
    if (open && tarea) {
      setComentario("");

      const d = tarea.detalles || {};

      // --- 1. Inicialización de Detalles según Tarea ---
      const initDetalle = { ...d };

      if (tipoCodigo === "cosecha") {
        initDetalle.kg_cosechados = d.kg_cosechados || "";
        initDetalle.grado_madurez = d.grado_madurez || "";
        initDetalle.higiene_verificada = !!d.higiene_verificada;
      } else if (["poda", "nutricion", "fitosanitario"].includes(tipoCodigo)) {
        // Avance (porcentaje)
        initDetalle.porcentaje_plantas_real_pct =
          d.porcentaje_plantas_real_pct ??
          d.porcentaje_plantas_plan_pct ??
          100;

        // Poda
        if (tipoCodigo === "poda") {
          initDetalle.herramientas_desinfectadas = !!d.herramientas_desinfectadas;
          initDetalle.disposicion_restos = d.disposicion_restos || "";
        }

        // Nutrición / Fito
        if (["nutricion", "fitosanitario"].includes(tipoCodigo)) {
          initDetalle.clima_inicio = d.clima_inicio || "";
          initDetalle.epp_verificado = !!d.epp_verificado;

          // ✅ editable en verificar
          initDetalle.periodo_reingreso_horas = d.periodo_reingreso_horas ?? 0;
        }
      } else if (tipoCodigo === "maleza") {
        initDetalle.cobertura_real_pct =
          d.cobertura_real_pct ?? d.cobertura_planificada_pct ?? 100;
        initDetalle.altura_corte_cm = d.altura_corte_cm || "";
      } else if (tipoCodigo === "enfundado") {
        initDetalle.porcentaje_frutos_real_pct =
          d.porcentaje_frutos_real_pct ?? d.porcentaje_frutos_plan_pct ?? 100;
      }

      setValoresDetalle(initDetalle);

      // --- 2. Inicialización de Items (Insumos) ---
      const initItems = {};
      (tarea.items || []).forEach((it) => {
        initItems[it.id] = {
          cantidad_real:
            it.cantidad_real > 0 ? it.cantidad_real : it.cantidad_planificada,
          lote_insumo_manual: it.lote_insumo_manual || "",
        };
      });
      setValoresItems(initItems);
    }
  }, [open, tarea, tipoCodigo]);

  const handleChangeDetalle = (k, v) =>
    setValoresDetalle((p) => ({ ...p, [k]: v }));

  const handleChangeItem = (id, k, v) =>
    setValoresItems((p) => ({ ...p, [id]: { ...p[id], [k]: v } }));

  const buildPayload = () => {
    const detalleFinal = { ...(tarea?.detalles || {}), ...(valoresDetalle || {}) };

    const itemsPayload = Object.entries(valoresItems || {}).map(([id, val]) => ({
      id: Number(id),
      cantidad_real: Number(val?.cantidad_real ?? 0),
      lote_insumo_manual: val?.lote_insumo_manual || "",
    }));

    return {
      comentario: comentario.trim() || undefined,
      detalle: detalleFinal,
      items: itemsPayload,
    };
  };

  const handleConfirmar = async () => {
    setLoading(true);
    try {
      const payload = buildPayload();

      // Validación específica Cosecha
      if (
        tipoCodigo === "cosecha" &&
        (!payload.detalle?.kg_cosechados || Number(payload.detalle.kg_cosechados) <= 0)
      ) {
        throw new Error("El peso en báscula es obligatorio.");
      }

      if (esCompletar) await completarTarea(tarea.id, payload);
      else if (esVerificar) await verificarTarea(tarea.id, payload);

      notify.success("Operación exitosa");
      onClose?.();
      onRefrescar?.();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Error";

      // ✅ Forzar verificación si stock insuficiente
      if (esVerificar && String(msg).toLowerCase().includes("stock")) {
        const ok = window.confirm(
          "Stock insuficiente. ¿Forzar verificación (permitir stock negativo)?"
        );

        if (ok) {
          try {
            const payload = buildPayload();
            await verificarTarea(tarea.id, { ...payload, force: true });

            notify.success("Verificación forzada realizada");
            onClose?.();
            onRefrescar?.();
          } catch (err2) {
            notify.error(err2?.response?.data?.message || "Error al forzar verificación");
          }
        }
      } else {
        notify.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     Campos por tipo
  ========================= */
  const renderCamposEspecificos = () => {
    const d = tarea?.detalles || {};

    switch (tipoCodigo) {
      case "cosecha":
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RealInputCard
                label="Kg Báscula"
                value={valoresDetalle.kg_cosechados}
                onChange={(e) => handleChangeDetalle("kg_cosechados", e.target.value)}
                type="number"
                step="0.01"
                unit="kg"
              />
              <Input
                label="Grado Madurez"
                type="number"
                value={valoresDetalle.grado_madurez}
                onChange={(e) => handleChangeDetalle("grado_madurez", e.target.value)}
              />
            </div>

            <div className="bg-sky-50 p-3 rounded-xl border border-sky-100 flex items-center gap-3">
              <Droplets className="text-sky-600" size={20} />
              <label className="flex items-center gap-2 cursor-pointer w-full">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-sky-600"
                  checked={!!valoresDetalle.higiene_verificada}
                  onChange={(e) =>
                    handleChangeDetalle("higiene_verificada", e.target.checked)
                  }
                />
                <span className="text-sm font-bold text-sky-800">
                  Higiene Verificada
                </span>
              </label>
            </div>
          </>
        );

      case "poda":
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PlannedCard label="Plan (Plantas)" value={d.porcentaje_plantas_plan_pct} unit="%" />
              <RealInputCard
                label="Real Ejecutado"
                value={valoresDetalle.porcentaje_plantas_real_pct}
                onChange={(e) =>
                  handleChangeDetalle("porcentaje_plantas_real_pct", e.target.value)
                }
                type="number"
                min="0"
                max="100"
                unit="%"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                  valoresDetalle.herramientas_desinfectadas
                    ? "bg-emerald-50 border-emerald-100"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <ShieldCheck
                  className={
                    valoresDetalle.herramientas_desinfectadas
                      ? "text-emerald-600"
                      : "text-slate-400"
                  }
                  size={20}
                />
                <label className="flex items-center gap-2 cursor-pointer w-full select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    checked={!!valoresDetalle.herramientas_desinfectadas}
                    onChange={(e) =>
                      handleChangeDetalle("herramientas_desinfectadas", e.target.checked)
                    }
                  />
                  <span
                    className={`text-sm font-bold ${
                      valoresDetalle.herramientas_desinfectadas
                        ? "text-emerald-800"
                        : "text-slate-500"
                    }`}
                  >
                    Herramientas Desinfectadas
                  </span>
                </label>
              </div>

              <Input
                label="Disposición de Restos"
                placeholder="Ej. Compostaje, Picado..."
                value={valoresDetalle.disposicion_restos}
                onChange={(e) =>
                  handleChangeDetalle("disposicion_restos", e.target.value)
                }
              />
            </div>
          </>
        );

      case "maleza":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PlannedCard
                label="Plan (Cobertura)"
                value={d.cobertura_planificada_pct}
                unit="%"
              />
              <RealInputCard
                label="Cobertura Real"
                value={valoresDetalle.cobertura_real_pct}
                onChange={(e) =>
                  handleChangeDetalle("cobertura_real_pct", e.target.value)
                }
                type="number"
                min="0"
                max="100"
                unit="%"
              />
            </div>

            <Input
              label="Altura Corte (cm)"
              type="number"
              value={valoresDetalle.altura_corte_cm}
              onChange={(e) =>
                handleChangeDetalle("altura_corte_cm", e.target.value)
              }
            />
          </div>
        );

      case "nutricion":
      case "fitosanitario":
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PlannedCard label="Plan (Área)" value={d.porcentaje_plantas_plan_pct} unit="%" />
              <RealInputCard
                label="Área Cubierta"
                value={valoresDetalle.porcentaje_plantas_real_pct}
                onChange={(e) =>
                  handleChangeDetalle("porcentaje_plantas_real_pct", e.target.value)
                }
                type="number"
                min="0"
                max="100"
                unit="%"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                  valoresDetalle.epp_verificado
                    ? "bg-emerald-50 border-emerald-100"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <ShieldCheck
                  className={
                    valoresDetalle.epp_verificado
                      ? "text-emerald-600"
                      : "text-slate-400"
                  }
                  size={20}
                />
                <label className="flex items-center gap-2 cursor-pointer w-full select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    checked={!!valoresDetalle.epp_verificado}
                    onChange={(e) =>
                      handleChangeDetalle("epp_verificado", e.target.checked)
                    }
                  />
                  <span
                    className={`text-sm font-bold ${
                      valoresDetalle.epp_verificado
                        ? "text-emerald-800"
                        : "text-slate-500"
                    }`}
                  >
                    EPP Verificado
                  </span>
                </label>
              </div>

              <div className="relative">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Clima Inicio
                </label>
                <div className="relative">
                  <select
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
                    value={valoresDetalle.clima_inicio}
                    onChange={(e) => handleChangeDetalle("clima_inicio", e.target.value)}
                  >
                    <option value="">Seleccione...</option>
                    <option value="Soleado">Soleado</option>
                    <option value="Nublado">Nublado</option>
                    <option value="Lluvioso">Lluvioso</option>
                    <option value="Viento">Viento Fuerte</option>
                  </select>
                  <CloudSun
                    size={16}
                    className="absolute top-2.5 right-3 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>
            </div>

            {esVerificar && (
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-600" />
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                    Tiempo Reingreso
                  </span>
                </div>
                <div className="flex items-center gap-2 w-36">
                  <input
                    type="number"
                    className="w-full bg-white border border-amber-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 text-right focus:ring-2 focus:ring-amber-500 outline-none"
                    value={valoresDetalle.periodo_reingreso_horas ?? 0}
                    onChange={(e) =>
                      handleChangeDetalle("periodo_reingreso_horas", e.target.value)
                    }
                  />
                  <span className="text-xs font-bold text-amber-600">h</span>
                </div>
              </div>
            )}
          </>
        );

      case "enfundado":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PlannedCard label="Plan (Frutos)" value={d.porcentaje_frutos_plan_pct} unit="%" />
            <RealInputCard
              label="Frutos Enfundados"
              value={valoresDetalle.porcentaje_frutos_real_pct}
              onChange={(e) =>
                handleChangeDetalle("porcentaje_frutos_real_pct", e.target.value)
              }
              type="number"
              min="0"
              max="100"
              unit="%"
            />
          </div>
        );

      default:
        return null;
    }
  };

  const renderResumenCosecha = () => {
    if (tipoCodigo !== "cosecha") return null;

    const d = tarea?.detalles || {};
    const totalRecibido = d.total_dinero || 0;
    const entregadas = d.entrega?.gabetas_entregadas || 0;

    return (
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-500">
        {esVerificar && d.entrega?.centro_acopio ? (
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <Truck size={12} />
              <span>
                Entrega: <strong>{d.entrega.centro_acopio}</strong> ({entregadas} gab.)
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span>Total:</span>
              <strong className="text-emerald-600 bg-white px-2 py-0.5 rounded border shadow-sm">
                ${Number(totalRecibido).toFixed(2)}
              </strong>
            </div>
          </div>
        ) : (
          <div className="italic text-center flex items-center justify-center gap-2">
            <Info size={12} /> Registra los detalles de filas y logística en la pantalla principal antes de verificar.
          </div>
        )}
      </div>
    );
  };

  const renderItems = () => {
    if (!tarea?.items || tarea.items.length === 0) return null;

    return (
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">
          Consumo Insumos
        </h4>

        <div className="space-y-2">
          {tarea.items.map((it) => {
            const val = valoresItems[it.id] || {};
            return (
              <div
                key={it.id}
                className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-slate-100"
              >
                <div className="md:col-span-1">
                  <span className="text-xs font-bold text-slate-700 block">
                    {it.nombre}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Plan: {formatCantidad(it.cantidad_planificada)} {it.unidad}
                  </span>
                </div>

                <div className="md:col-span-1 flex items-center gap-2 justify-start md:justify-end">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">
                    Real
                  </span>
                  <input
                    type="number"
                    className="w-28 text-sm text-right border rounded-lg px-2 py-1 font-bold text-slate-700 focus:ring-1 focus:ring-emerald-500 outline-none"
                    value={val.cantidad_real ?? ""}
                    onChange={(e) =>
                      handleChangeItem(it.id, "cantidad_real", e.target.value)
                    }
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                    Lote / Batch (manual)
                  </label>
                  <input
                    type="text"
                    className="w-full text-sm border rounded-lg px-2 py-1 font-medium text-slate-700 focus:ring-1 focus:ring-emerald-500 outline-none"
                    value={val.lote_insumo_manual ?? ""}
                    onChange={(e) =>
                      handleChangeItem(it.id, "lote_insumo_manual", e.target.value)
                    }
                    placeholder="Ej. LOTE-2026-01"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* =========================
     Render
  ========================= */
  const tituloModal = esVerificar ? "Verificar Tarea" : "Registrar Avance";
  const descModal = esVerificar
    ? "Valida el trabajo realizado y deja observaciones si aplica."
    : "Registra el avance real, controles y consumo de insumos en campo.";

  return (
    <VentanaModal
      abierto={open}
      cerrar={onClose}
      titulo={tituloModal}
      descripcion={descModal}
      icon={esVerificar ? ShieldCheck : CheckCircle}
      maxWidthClass="sm:max-w-[min(980px,calc(100vw-1rem))]"
      bodyClass="px-4 sm:px-6 lg:px-8 py-5"
      footer={
        <>
          <Boton variante="fantasma" onClick={onClose} disabled={loading}>
            Cancelar
          </Boton>
          <Boton onClick={handleConfirmar} cargando={loading} disabled={loading}>
            Confirmar
          </Boton>
        </>
        
      }
    >
      <div className="space-y-6">
        {esCompletar && isSupervisor && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-3">
            <Info size={18} className="text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-blue-800 uppercase">
                Modo Supervisor
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                Puedes registrar avance como supervisor.
              </p>
            </div>
          </div>
        )}

        {renderCamposEspecificos()}

        {renderResumenCosecha()}

        {renderItems()}

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Comentarios
          </label>
          <textarea
            className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            rows={3}
            placeholder="Comentarios adicionales..."
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />
        </div>
      </div>
    </VentanaModal>
  );
}
