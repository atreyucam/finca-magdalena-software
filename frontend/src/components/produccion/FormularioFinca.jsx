import { useState } from "react";
import { toast } from "sonner";
import { crearFinca } from "../../api/apiClient";
import Input from "../ui/Input";
import Boton from "../ui/Boton";
import { Save } from "lucide-react";

export default function FormularioFinca({ alGuardar, alCancelar }) {
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({ nombre: "", hectareas_totales: "", ubicacion: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      await crearFinca({ ...form, hectareas_totales: Number(form.hectareas_totales) });
      toast.success("Finca registrada");
      alGuardar();
    } catch (err) { toast.error("Error al registrar finca"); }
    finally { setCargando(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Nombre de la Finca" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required placeholder="Ej: Finca Rosa" />
      <Input label="Hectáreas Totales" type="number" step="0.1" value={form.hectareas_totales} onChange={e => setForm({...form, hectareas_totales: e.target.value})} required />
      <Input label="Ubicación / Sector" value={form.ubicacion} onChange={e => setForm({...form, ubicacion: e.target.value})} placeholder="Ej: Sangay, Palora" />
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Boton variante="fantasma" onClick={alCancelar} type="button">Cancelar</Boton>
        <Boton tipo="submit" cargando={cargando} icono={Save}>Guardar Finca</Boton>
      </div>
    </form>
  );
}