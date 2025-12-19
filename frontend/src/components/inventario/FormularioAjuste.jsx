import { useState } from "react";
import toast from "react-hot-toast";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { ajustarStock } from "../../api/apiClient";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Boton from "../ui/Boton";

export default function FormularioAjuste({ item, unidades = [], alGuardar, alCancelar }) {
  const [cargando, setCargando] = useState(false);
  const [tipoMov, setTipoMov] = useState("AJUSTE_ENTRADA"); // AJUSTE_ENTRADA | AJUSTE_SALIDA

  const esEntrada = tipoMov === "AJUSTE_ENTRADA";
  const esInsumo = item?.categoria === "Insumo";
  const requiereLote = esInsumo && esEntrada;

  const [form, setForm] = useState({
    cantidad: "",
    unidad_codigo: item?.unidad || unidades[0]?.codigo || "",
    motivo: "",
    // Lote
    codigo_lote: "",
    fecha_vencimiento: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const unidadObj = unidades.find(u => u.codigo === form.unidad_codigo);
    if (!unidadObj) return toast.error("Unidad inválida");

    if (requiereLote && (!form.codigo_lote || !form.fecha_vencimiento)) {
        return toast.error("Datos de lote requeridos para entrada de insumos");
    }

    const payload = {
      tipo: tipoMov,
      cantidad: Number(form.cantidad),
      unidad_id: unidadObj.id,
      motivo: form.motivo,
      // Enviar snake_case 'datos_lote'
      datos_lote: requiereLote ? {
          codigo_lote_proveedor: form.codigo_lote,
          fecha_vencimiento: form.fecha_vencimiento
      } : null
    };

    try {
      setCargando(true);
      await ajustarStock(item.id, payload);
      toast.success("Stock ajustado correctamente");
      alGuardar?.();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error al ajustar stock");
    } finally {
      setCargando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Botones Tipo */}
      <div className="grid grid-cols-2 gap-4">
        <button type="button" onClick={() => setTipoMov("AJUSTE_ENTRADA")}
          className={`p-4 rounded-xl border-2 flex flex-col items-center ${esEntrada ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200'}`}>
          <ArrowDownCircle className="mb-2"/> <span className="font-bold">Entrada (+)</span>
        </button>
        <button type="button" onClick={() => setTipoMov("AJUSTE_SALIDA")}
          className={`p-4 rounded-xl border-2 flex flex-col items-center ${!esEntrada ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200'}`}>
          <ArrowUpCircle className="mb-2"/> <span className="font-bold">Salida (-)</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Cantidad" type="number" step="0.001" value={form.cantidad} onChange={e => setForm({...form, cantidad: e.target.value})} required autoFocus />
        <Select label="Unidad" value={form.unidad_codigo} onChange={e => setForm({...form, unidad_codigo: e.target.value})}>
            {unidades.map(u => <option key={u.id} value={u.codigo}>{u.codigo}</option>)}
        </Select>
      </div>

      {requiereLote && (
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 grid grid-cols-2 gap-4 animate-in fade-in">
              <div className="col-span-2 font-bold text-xs text-amber-800 uppercase">Datos del Nuevo Lote</div>
              <Input label="Lote / Serie" value={form.codigo_lote} onChange={e => setForm({...form, codigo_lote: e.target.value})} required />
              <Input label="Vencimiento" type="date" value={form.fecha_vencimiento} onChange={e => setForm({...form, fecha_vencimiento: e.target.value})} required />
          </div>
      )}

      <Input label="Motivo del ajuste" placeholder="Ej: Compra urgente, merma, corrección..." value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})} />

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Boton type="button" variante="fantasma" onClick={alCancelar}>Cancelar</Boton>
          <Boton tipo="submit" variante={esEntrada ? "exito" : "peligro"} cargando={cargando}>Confirmar</Boton>
      </div>
    </form>
  );
}