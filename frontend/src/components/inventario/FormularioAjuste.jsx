// frontend/src/components/inventario/FormularioAjuste.jsx
import { useEffect, useMemo, useState } from "react";
import useToast from "../../hooks/useToast";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Info,
  Loader2,
  AlertTriangle,
  ClipboardList,
  Package,
  X,
} from "lucide-react";
import { ajustarStock, buscarLoteInventario } from "../../api/apiClient";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Boton from "../ui/Boton";

function fmtQty(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return n ?? "0";
  return num.toFixed(3);
}

function safe(v) {
  if (v === null || v === undefined) return "—";
  const s = String(v);
  return s.trim() === "" ? "—" : s;
}

// ✅ Encabezado consistente para secciones dentro del modal
function SectionTitle({ icon: Icon, title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={16} className="text-slate-500" />}
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            {title}
          </p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

// ✅ Header estilo "FormularioFinca" (padding + bg + borde)
function ModalHeader({ title, subtitle, icon: Icon, onClose }) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-200 flex items-start justify-between bg-slate-50/50">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
          {Icon ? <Icon size={20} strokeWidth={2.5} /> : null}
        </div>

        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Si tu VentanaModal ya trae X, puedes pasar onClose={null} */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Cerrar"
          title="Cerrar"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
}

export default function FormularioAjuste({
  item,
  unidades = [],
  alGuardar,
  alCancelar,
}) {
  const notify = useToast();
  const [cargando, setCargando] = useState(false);
  const [tipoMov, setTipoMov] = useState("AJUSTE_ENTRADA"); // AJUSTE_ENTRADA | AJUSTE_SALIDA

  const esEntrada = tipoMov === "AJUSTE_ENTRADA";
  const esInsumo = item?.categoria === "Insumo";
  const requiereLote = esInsumo && esEntrada;

  const unidadDefault = useMemo(() => {
    return item?.unidad || unidades?.[0]?.codigo || "";
  }, [item?.unidad, unidades]);

  const [form, setForm] = useState({
    cantidad: "",
    unidad_codigo: unidadDefault,
    motivo: "",
    codigo_lote: "",
    fecha_vencimiento: "",
  });

  const [loteState, setLoteState] = useState({
    loading: false,
    existe: false,
    lote: null,
    error: null,
  });

  // Set unidad por defecto
  useEffect(() => {
    setForm((f) => ({ ...f, unidad_codigo: f.unidad_codigo || unidadDefault }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadDefault]);

  // Si deja de requerir lote, limpiar
  useEffect(() => {
    if (!requiereLote) {
      setForm((f) => ({ ...f, codigo_lote: "", fecha_vencimiento: "" }));
      setLoteState({ loading: false, existe: false, lote: null, error: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiereLote]);

  // Debounce validar lote
  useEffect(() => {
    if (!requiereLote) return;

    const codigo = (form.codigo_lote || "").trim().toUpperCase();
    if (codigo.length < 2) {
      setLoteState({ loading: false, existe: false, lote: null, error: null });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoteState((s) => ({ ...s, loading: true, error: null }));

        const params = form.fecha_vencimiento
          ? { codigo, fecha_vencimiento: form.fecha_vencimiento }
          : { codigo };

        const res = await buscarLoteInventario(item.id, params);
        const data = res.data;

        if (data?.existe) {
          setLoteState({
            loading: false,
            existe: true,
            lote: data.lote,
            error: null,
          });

          if (!form.fecha_vencimiento && data.lote?.fecha_vencimiento) {
            setForm((f) => ({
              ...f,
              fecha_vencimiento: String(data.lote.fecha_vencimiento).slice(0, 10),
            }));
          }
        } else {
          setLoteState({ loading: false, existe: false, lote: null, error: null });
        }
      } catch (err) {
        setLoteState({
          loading: false,
          existe: false,
          lote: null,
          error: err?.response?.data?.message || "No se pudo validar el lote",
        });
      }
    }, 450);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.codigo_lote, form.fecha_vencimiento, requiereLote, item?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const unidadObj = unidades.find((u) => u.codigo === form.unidad_codigo);
    if (!unidadObj) return notify.error("Unidad inválida");

    if (!form.cantidad || Number(form.cantidad) <= 0) {
      return notify.error("Cantidad inválida");
    }

    if (requiereLote) {
      if (!form.codigo_lote.trim()) return notify.error("Falta el código de lote");
      if (!form.fecha_vencimiento) return notify.error("Falta la fecha de vencimiento");
      if (loteState.error) return notify.error("Corrige la validación del lote antes de confirmar");
    }

    const payload = {
      tipo: tipoMov,
      cantidad: Number(form.cantidad),
      unidad_id: unidadObj.id,
      motivo: form.motivo,
      datos_lote: requiereLote
        ? {
            codigo_lote_proveedor: form.codigo_lote.trim().toUpperCase(),
            fecha_vencimiento: form.fecha_vencimiento,
          }
        : null,
    };

    try {
      setCargando(true);
      await ajustarStock(item.id, payload);
      notify.success("Stock ajustado correctamente");
      alGuardar?.();
    } catch (err) {
      console.error(err);
      notify.error(err.response?.data?.message || "Error al ajustar stock");
    } finally {
      setCargando(false);
    }
  };

  return (
    // ✅ (Opcional) “contenedor” para que el contenido no choque y se sienta como Finca.
    // Si tu VentanaModal es muy angosto, aquí no lo podemos ensanchar del todo,
    // pero sí logramos el MISMO padding/aire interno y look & feel.
    <div className="w-full">
      {/* ✅ HEADER con padding y fondo tipo Finca */}
      <ModalHeader
        icon={Package}
        title={`Ajuste de stock: ${safe(item?.nombre)}`}
        subtitle="Registra entradas y salidas, y controla lotes (FEFO) en insumos."
        onClose={alCancelar} // si VentanaModal ya tiene X, pon null
      />

      {/* ✅ BODY con padding consistente tipo Finca */}
      <form
        onSubmit={handleSubmit}
        className="space-y-6 px-4 sm:px-6 lg:px-8 py-5"
      >
        {/* Tipo */}
        <div className="space-y-3">
          <SectionTitle
            icon={ClipboardList}
            title="Tipo de movimiento"
            subtitle="Selecciona cómo afecta al stock"
          />

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setTipoMov("AJUSTE_ENTRADA")}
              className={[
                "p-4 rounded-2xl border-2 flex flex-col items-center transition",
                esEntrada
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white hover:bg-slate-50",
              ].join(" ")}
            >
              <ArrowDownCircle className="mb-2" />
              <span className="font-black">Entrada (+)</span>
              <span className="text-xs opacity-80">Aumenta stock</span>
            </button>

            <button
              type="button"
              onClick={() => setTipoMov("AJUSTE_SALIDA")}
              className={[
                "p-4 rounded-2xl border-2 flex flex-col items-center transition",
                !esEntrada
                  ? "border-rose-500 bg-rose-50 text-rose-700"
                  : "border-slate-200 bg-white hover:bg-slate-50",
              ].join(" ")}
            >
              <ArrowUpCircle className="mb-2" />
              <span className="font-black">Salida (-)</span>
              <span className="text-xs opacity-80">Disminuye stock</span>
            </button>
          </div>
        </div>

        {/* Detalle del insumo (solo lectura) */}
        {esInsumo && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <SectionTitle
              icon={Package}
              title="Detalle del insumo"
              subtitle="Información de solo lectura"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Proveedor" value={safe(item?.proveedor)} disabled />
              <Input label="Ingrediente activo" value={safe(item?.ingrediente_activo)} disabled />
              <Input label="Formulación" value={safe(item?.formulacion)} disabled />
              <Input label="Stock mínimo" value={safe(item?.stock_minimo)} disabled />
              <Input label="Stock actual" value={safe(item?.stock_actual)} disabled />
            </div>
          </div>
        )}

        {/* Cantidad + unidad */}
        <div className="space-y-3">
          <SectionTitle
            icon={Info}
            title="Cantidad y unidad"
            subtitle="Registra el ajuste con su unidad"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Cantidad"
              type="number"
              step="0.001"
              value={form.cantidad}
              onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
              required
              autoFocus
            />

            <Select
              label="Unidad"
              value={form.unidad_codigo}
              onChange={(e) => setForm({ ...form, unidad_codigo: e.target.value })}
            >
              {unidades.map((u) => (
                <option key={u.id} value={u.codigo}>
                  {u.codigo}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Lote */}
        {requiereLote && (
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-3 animate-in fade-in">
            <SectionTitle
              icon={AlertTriangle}
              title="Datos del lote"
              subtitle="Obligatorio para entradas de insumos"
              right={
                <span className="text-[10px] font-black px-2 py-1 rounded-full bg-amber-200 text-amber-900">
                  OBLIGATORIO
                </span>
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Lote / Serie"
                value={form.codigo_lote}
                placeholder="Ej: A-001"
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    codigo_lote: e.target.value.toUpperCase(),
                  }))
                }
                required
              />

              <Input
                label="Vencimiento"
                type="date"
                value={form.fecha_vencimiento}
                onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })}
                required
              />
            </div>

            <div className="rounded-2xl border bg-white px-3 py-2 text-sm">
              {loteState.loading ? (
                <div className="flex items-center gap-2 text-slate-600">
                  <Loader2 className="animate-spin" size={16} />
                  Validando lote...
                </div>
              ) : loteState.error ? (
                <div className="flex items-center gap-2 text-rose-700">
                  <AlertTriangle size={16} />
                  {loteState.error}
                </div>
              ) : loteState.existe ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                    <CheckCircle2 size={16} />
                    Lote encontrado: #{loteState.lote?.codigo_lote_proveedor}
                  </div>

                  <div className="text-xs text-slate-600 flex items-center gap-2">
                    <Info size={14} />
                    Stock en ese lote:{" "}
                    <span className="font-mono font-bold text-slate-800">
                      {fmtQty(loteState.lote?.cantidad_actual)}
                    </span>
                    <span className="text-slate-400">·</span>
                    Vence:{" "}
                    <span className="font-mono">
                      {String(loteState.lote?.fecha_vencimiento || "—").slice(0, 10)}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-amber-800">
                    ✅ Al confirmar, se registrará la entrada para este lote.
                  </div>
                </div>
              ) : (
                <div className="text-slate-600 flex items-center gap-2">
                  <Info size={16} />
                  Lote nuevo: se creará al confirmar.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Motivo */}
        <div className="space-y-3">
          <SectionTitle icon={Info} title="Motivo del ajuste" subtitle="Opcional, pero recomendado" />
          <Input
            label="Motivo"
            placeholder="Ej: Compra urgente, merma, corrección..."
            value={form.motivo}
            onChange={(e) => setForm({ ...form, motivo: e.target.value })}
          />
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Boton type="button" variante="fantasma" onClick={alCancelar}>
            Cancelar
          </Boton>
          <Boton type="submit" variante={esEntrada ? "exito" : "peligro"} cargando={cargando}>
            Confirmar
          </Boton>
        </div>
      </form>
    </div>
  );
}
