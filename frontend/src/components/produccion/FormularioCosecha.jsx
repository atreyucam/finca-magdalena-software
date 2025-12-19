import { useState } from "react";
import { toast } from "sonner";
import { crearCosecha } from "../../api/apiClient";
import Input from "../ui/Input";
import Boton from "../ui/Boton";
import Select from "../ui/Select";
import { Save } from "lucide-react";

export default function FormularioCosecha({ fincas, alGuardar, alCancelar }) {
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({ nombre: "", finca_id: "", numero: "", fecha_inicio: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      await crearCosecha({
        ...form,
        numero: Number(form.numero)
      });
      toast.success("Cosecha creada");
      alGuardar();
    } catch (err) {
      toast.error("Error al crear cosecha");
    } finally {
      setCargando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select label="Finca Destino" value={form.finca_id} onChange={e => setForm({...form, finca_id: e.target.value})} required>
        <option value="">Seleccione finca...</option>
        {fincas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
      </Select>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Nombre" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required placeholder="Ej: Cosecha 2025-1" />
        <Input label="Número Secuencial" type="number" value={form.numero} onChange={e => setForm({...form, numero: e.target.value})} required placeholder="1" />
      </div>
      <Input label="Fecha Inicio" type="date" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})} required />
      
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Boton variante="fantasma" onClick={alCancelar} type="button">Cancelar</Boton>
        <Boton tipo="submit" cargando={cargando} icono={Save}>Iniciar Cosecha</Boton>
      </div>
    </form>
  );
}