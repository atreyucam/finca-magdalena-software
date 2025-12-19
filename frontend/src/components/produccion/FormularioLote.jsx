import { useState } from "react";
import { toast } from "sonner";
import { crearLote } from "../../api/apiClient";
import Input from "../ui/Input";
import Boton from "../ui/Boton";
import { Save } from "lucide-react";
import Select from "../ui/Select";

export default function FormularioLote({ fincas, alGuardar, alCancelar }) {
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({ nombre: "", finca_id: "", superficie_ha: "", numero_plantas: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      await crearLote({
        ...form,
        superficie_ha: Number(form.superficie_ha),
        numero_plantas: Number(form.numero_plantas)
      });
      toast.success("Lote creado correctamente");
      alGuardar();
    } catch (err) {
      toast.error("Error al crear lote");
    } finally {
      setCargando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select label="Asignar a Finca" value={form.finca_id} onChange={e => setForm({...form, finca_id: e.target.value})} required>
        <option value="">Seleccione finca...</option>
        {fincas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
      </Select>
      <Input label="Nombre del lote" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required placeholder="Ej: Lote Norte" />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Superficie (ha)" type="number" step="0.01" value={form.superficie_ha} onChange={e => setForm({...form, superficie_ha: e.target.value})} required />
        <Input label="N° Plantas" type="number" value={form.numero_plantas} onChange={e => setForm({...form, numero_plantas: e.target.value})} required />
      </div>
      <Input label="Fecha Siembra" type="date" value={form.fecha_siembra} onChange={e => setForm({...form, fecha_siembra: e.target.value})} />
      
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Boton variante="fantasma" onClick={alCancelar} type="button">Cancelar</Boton>
        <Boton tipo="submit" cargando={cargando} icono={Save}>Guardar Lote</Boton>
      </div>
    </form>
  );
}