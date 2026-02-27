import { useEffect, useMemo, useState } from "react";
import useToast from "../../hooks/useToast";
import Input from "../ui/Input";
import Boton from "../ui/Boton";
import { editarLoteInventario } from "../../api/apiClient";
import { X, Package, Info, AlertTriangle } from "lucide-react";

function safe(v) {
  if (v === null || v === undefined) return "—";
  const s = String(v);
  return s.trim() === "" ? "—" : s;
}

// ✅ Encabezado estilo "FormularioFinca" (icono + titulo + subtitulo + padding)
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

      {/* Si tu VentanaModal ya trae X, pon onClose={null} */}
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

// ✅ Encabezado mini para secciones
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

/**
 * ✅ FormularioEditarLote (Opción B - FEFO)
 * - SOLO corrige: codigo_lote_proveedor, fecha_vencimiento
 * - NO toca cantidades, NO toca item_id, NO fusiona lotes.
 */
export default function FormularioEditarLote({
  lote,
  item,
  lotesExistentes = [],
  alCancelar,
  alGuardar,
}) {
  const notify = useToast();
  const [cargando, setCargando] = useState(false);

  const [form, setForm] = useState({
    codigo_lote_proveedor: lote?.codigo_lote_proveedor || "",
    fecha_vencimiento: (lote?.fecha_vencimiento || "").slice(0, 10),
  });

  // Mantener sincronizado si cambian lote/item
  useEffect(() => {
    setForm({
      codigo_lote_proveedor: lote?.codigo_lote_proveedor || "",
      fecha_vencimiento: (lote?.fecha_vencimiento || "").slice(0, 10),
    });
  }, [lote]);

  const norm = (s) => String(s || "").trim().toUpperCase();

  const duplicado = useMemo(() => {
    const codigoNuevo = norm(form.codigo_lote_proveedor);
    const vencNuevo = String(form.fecha_vencimiento || "").slice(0, 10);

    if (!codigoNuevo || !vencNuevo) return false;

    return lotesExistentes.some((l) => {
      if (!l) return false;
      if (String(l.id) === String(lote?.id)) return false;

      const c = norm(l.codigo_lote_proveedor);
      const v = String(l.fecha_vencimiento || "").slice(0, 10);

      return c === codigoNuevo && v === vencNuevo && (l.activo ?? true);
    });
  }, [form.codigo_lote_proveedor, form.fecha_vencimiento, lotesExistentes, lote?.id]);

  const cambios = useMemo(() => {
    const origCodigo = norm(lote?.codigo_lote_proveedor);
    const origVenc = String(lote?.fecha_vencimiento || "").slice(0, 10);

    const newCodigo = norm(form.codigo_lote_proveedor);
    const newVenc = String(form.fecha_vencimiento || "").slice(0, 10);

    return {
      codigo: origCodigo !== newCodigo,
      venc: origVenc !== newVenc,
      alguno: origCodigo !== newCodigo || origVenc !== newVenc,
    };
  }, [form.codigo_lote_proveedor, form.fecha_vencimiento, lote?.codigo_lote_proveedor, lote?.fecha_vencimiento]);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!form.codigo_lote_proveedor.trim()) return notify.error("El código de lote es obligatorio");
    if (!form.fecha_vencimiento) return notify.error("La fecha de vencimiento es obligatoria");

    if (!cambios.alguno) {
      notify.info?.("No hay cambios para guardar") || notify.success("No hay cambios para guardar");
      return;
    }

    if (duplicado) {
      return notify.error(
        "Ya existe otro lote activo con el mismo código y vencimiento. Esto rompería la trazabilidad (Opción B)."
      );
    }

    try {
      setCargando(true);

      const payload = {
        codigo_lote_proveedor: form.codigo_lote_proveedor.trim(),
        fecha_vencimiento: form.fecha_vencimiento,
      };

      await editarLoteInventario(lote.id, payload);

      notify.success("Lote actualizado");
      alGuardar?.();
    } catch (err) {
      console.error(err);
      notify.error(err.response?.data?.message || "Error al editar lote");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="w-full">
      {/* ✅ HEADER estilo finca/ajuste */}
      <ModalHeader
        icon={Package}
        title="Editar lote"
        subtitle={
          item
            ? `Actualiza código y vencimiento para: ${safe(item?.nombre)}.`
            : "Actualiza el código y el vencimiento del lote (FEFO)."
        }
        onClose={alCancelar} // si VentanaModal ya trae X, pon null
      />

      {/* ✅ BODY con padding consistente */}
      <form onSubmit={onSubmit} className="space-y-6 px-4 sm:px-6 lg:px-8 py-5">
        {/* ✅ Resumen del ítem (solo lectura) */}
        {item && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <SectionTitle
              icon={Info}
              title="Información del ítem"
              subtitle="Datos de solo lectura"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Nombre" value={safe(item?.nombre)} disabled />
              <Input label="Categoría" value={safe(item?.categoria)} disabled />
              <Input label="Unidad" value={safe(item?.unidad)} disabled />
              <Input label="Stock mín" value={safe(item?.stock_minimo)} disabled />
              <Input label="Ingrediente" value={safe(item?.ingrediente_activo)} disabled />
              <Input label="Formulación" value={safe(item?.formulacion)} disabled />
            </div>
          </div>
        )}

        {/* ✅ Advertencia si quedaría duplicado */}
        {duplicado && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-rose-800">No se puede guardar</p>
                <p className="text-sm text-rose-700 break-words mt-1">
                  Ya existe otro lote activo con el mismo <b>código</b> y <b>vencimiento</b>.
                  Esto fusionaría lotes y rompería la trazabilidad (Opción B).
                </p>
              </div>
              <div className="h-8 w-8 shrink-0 grid place-items-center rounded-full bg-rose-100 text-rose-700">
                <AlertTriangle size={18} />
              </div>
            </div>
          </div>
        )}

        {/* Campos editables */}
        <div className="space-y-3">
          <SectionTitle
            icon={Info}
            title="Datos del lote"
            subtitle="Edita solo código y vencimiento"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Código de lote"
              value={form.codigo_lote_proveedor}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  codigo_lote_proveedor: e.target.value.toUpperCase(),
                }))
              }
              required
              placeholder="Ej: A-001"
            />

            <Input
              label="Vencimiento"
              type="date"
              value={form.fecha_vencimiento}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, fecha_vencimiento: e.target.value }))
              }
              required
            />
          </div>

          {/* Chip de cambios */}
          <div className="flex flex-wrap gap-2 pt-1">
            <span
              className={[
                "text-[11px] font-black px-2 py-1 rounded-full",
                cambios.codigo ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-600",
              ].join(" ")}
              title="Cambio en código"
            >
              CÓDIGO {cambios.codigo ? "MODIFICADO" : "SIN CAMBIO"}
            </span>

            <span
              className={[
                "text-[11px] font-black px-2 py-1 rounded-full",
                cambios.venc ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-600",
              ].join(" ")}
              title="Cambio en vencimiento"
            >
              VENCIMIENTO {cambios.venc ? "MODIFICADO" : "SIN CAMBIO"}
            </span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Boton
            type="button"
            variante="fantasma"
            onClick={alCancelar}
            disabled={cargando}
          >
            Cancelar
          </Boton>

          <Boton
            tipo="submit"
            variante="exito"
            cargando={cargando}
            disabled={duplicado || !cambios.alguno}
            title={
              duplicado
                ? "Corrige el duplicado para poder guardar"
                : !cambios.alguno
                ? "No hay cambios para guardar"
                : undefined
            }
          >
            Guardar
          </Boton>
        </div>
      </form>
    </div>
  );
}
