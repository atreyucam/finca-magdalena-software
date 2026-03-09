import { useEffect, useMemo, useState } from "react";
import useToast from "../../hooks/useToast";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ClipboardList,
  Info,
  Package,
  X,
} from "lucide-react";
import { ajustarStock } from "../../api/apiClient";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Boton from "../ui/Boton";

function safe(v) {
  if (v === null || v === undefined) return "—";
  const s = String(v);
  return s.trim() === "" ? "—" : s;
}

function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={16} className="text-slate-500" />}
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{title}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle, icon: Icon, onClose }) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-200 flex items-start justify-between bg-slate-50/50">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
          {Icon ? <Icon size={20} strokeWidth={2.5} /> : null}
        </div>

        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{title}</h2>
          {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>

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

export default function FormularioAjuste({ item, unidades = [], alGuardar, alCancelar }) {
  const notify = useToast();
  const [cargando, setCargando] = useState(false);
  const [tipoMov, setTipoMov] = useState("AJUSTE_ENTRADA");

  const unidadDefault = useMemo(() => {
    return item?.unidad || unidades?.[0]?.codigo || "";
  }, [item?.unidad, unidades]);

  const [form, setForm] = useState({
    cantidad: "",
    unidad_codigo: unidadDefault,
    motivo: "",
  });

  useEffect(() => {
    setForm((prev) => ({ ...prev, unidad_codigo: prev.unidad_codigo || unidadDefault }));
  }, [unidadDefault]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const unidadObj = unidades.find((u) => u.codigo === form.unidad_codigo);
    if (!unidadObj) return notify.error("Unidad invalida");

    const cantidad = Number(form.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return notify.error("Cantidad invalida");
    }

    const payload = {
      tipo: tipoMov,
      cantidad,
      unidad_id: unidadObj.id,
      motivo: form.motivo,
    };

    try {
      setCargando(true);
      await ajustarStock(item.id, payload);
      notify.success("Stock ajustado correctamente");
      alGuardar?.();
    } catch (err) {
      notify.error(err?.response?.data?.message || "Error al ajustar stock");
    } finally {
      setCargando(false);
    }
  };

  const esEntrada = tipoMov === "AJUSTE_ENTRADA";

  return (
    <div className="w-full">
      <ModalHeader
        icon={Package}
        title={`Ajuste de stock: ${safe(item?.nombre)}`}
        subtitle="Dominio simplificado: ajuste sin lotes ni vencimientos."
        onClose={alCancelar}
      />

      <form onSubmit={handleSubmit} className="space-y-6 px-4 sm:px-6 lg:px-8 py-5">
        <div className="space-y-3">
          <SectionTitle icon={ClipboardList} title="Tipo de movimiento" subtitle="Define como afecta al stock" />

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

        {item?.categoria === "Insumo" && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <SectionTitle icon={Info} title="Detalle del insumo" subtitle="Solo lectura" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Fabricante" value={safe(item?.fabricante)} disabled />
              <Input label="Stock total" value={safe(item?.stock_actual)} disabled />
            </div>
          </div>
        )}

        <div className="space-y-3">
          <SectionTitle icon={Info} title="Cantidad y unidad" subtitle="Cantidad del ajuste" />
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

        <div className="space-y-3">
          <SectionTitle icon={Info} title="Motivo del ajuste" subtitle="Opcional" />
          <Input
            label="Motivo"
            placeholder="Ej: Compra, salida a campo, correccion"
            value={form.motivo}
            onChange={(e) => setForm({ ...form, motivo: e.target.value })}
          />
        </div>

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
