// src/components/produccion/GestionPeriodos.jsx
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { obtenerCosecha, crearPeriodosCosecha, eliminarPeriodoCosecha } from "../../api/apiClient";
import Boton from "../ui/Boton";
import Select from "../ui/Select";

// Opciones estandarizadas según tu lógica de negocio
const OPCIONES = ["Pre-Floración", "Floración", "Crecimiento", "Cosecha/Recuperación"];

export default function GestionPeriodos({ cosecha, onUpdated }) {
  const [periodos, setPeriodos] = useState([]);
  const [nuevo, setNuevo] = useState("");
  const [cargando, setCargando] = useState(false);

  // Cargar periodos actuales de la cosecha seleccionada
  const cargar = async () => {
    if (!cosecha?.id) return;
    try {
      const res = await obtenerCosecha(cosecha.id);
      // Ajusta esto según si tu backend devuelve res.data o directo
      setPeriodos(res.data?.PeriodoCosechas || res.data?.PeriodoCosecha || []);
    } catch (e) {
      console.error(e);
      toast.error("Error al cargar periodos");
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cosecha]);

  // Agregar nuevo periodo
  const handleAgregar = async (e) => {
    e.preventDefault();
    if (!nuevo) return;
    
    setCargando(true);
    try {
      // El backend espera un array de periodos
      await crearPeriodosCosecha(cosecha.id, [{ nombre: nuevo }]);
      toast.success("Periodo agregado correctamente");
      setNuevo("");
      await cargar();
      onUpdated?.(); // Notificar al padre para recargar si es necesario
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Error al agregar periodo");
    } finally {
      setCargando(false);
    }
  };

  // Eliminar periodo
  const handleEliminar = async (id) => {
    if (!confirm("¿Estás seguro de eliminar este periodo?")) return;
    
    try {
      await eliminarPeriodoCosecha(id);
      toast.success("Periodo eliminado");
      await cargar();
      onUpdated?.();
    } catch (e) {
      console.error(e);
      toast.error("Error al eliminar");
    }
  };

  // Filtrar opciones que ya han sido agregadas
  const disponibles = OPCIONES.filter(op => !periodos.some(p => p.nombre === op));

  return (
    <div className="space-y-6">
       {/* Lista de Periodos Existentes */}
       <div className="space-y-2">
          {periodos.length === 0 ? (
             <p className="text-sm text-slate-400 italic text-center py-4 border border-dashed border-slate-200 rounded-xl">
                No hay periodos registrados para esta cosecha.
             </p>
          ) : (
             periodos.map(p => (
                <div key={p.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl transition-colors hover:border-slate-200">
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="text-sm font-medium text-slate-700">{p.nombre}</span>
                   </div>
                   <button 
                      onClick={() => handleEliminar(p.id)} 
                      className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                      title="Eliminar periodo"
                   >
                      <Trash2 size={16}/>
                   </button>
                </div>
             ))
          )}
       </div>

       {/* Formulario para agregar (solo si hay opciones disponibles) */}
       {disponibles.length > 0 ? (
          <form onSubmit={handleAgregar} className="flex gap-2 pt-4 border-t border-slate-100 items-end">
             <div className="flex-1">
                <Select 
                    label="Agregar etapa" 
                    value={nuevo} 
                    onChange={e => setNuevo(e.target.value)}
                    contenedorClass="mb-0" // Quitar margen inferior si lo tiene
                >
                    <option value="">Seleccionar etapa...</option>
                    {disponibles.map(op => <option key={op} value={op}>{op}</option>)}
                </Select>
             </div>
             <Boton 
                tipo="submit" 
                disabled={!nuevo || cargando} 
                cargando={cargando} 
                className="shrink-0 mb-[1px]" // Ajuste visual para alinear con el input
                variante="secundario"
             >
                <Plus size={18}/> Agregar
             </Boton>
          </form>
       ) : (
          <p className="text-xs text-emerald-600 font-medium text-center pt-4 border-t border-slate-100">
             ✅ Todas las etapas han sido registradas.
          </p>
       )}
    </div>
  );
}