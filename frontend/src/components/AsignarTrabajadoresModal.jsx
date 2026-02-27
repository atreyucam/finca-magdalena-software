import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, UserPlus, UserMinus, Users, UserCheck, Briefcase } from "lucide-react";
import { listarUsuarios, actualizarAsignaciones, obtenerTarea } from "../api/apiClient";
import VentanaModal from "./ui/VentanaModal";
import Boton from "./ui/Boton";

export default function AsignacionesModal({ tareaId, open, onClose, onSaved }) {
  const [usuarios, setUsuarios] = useState([]);
  const [selAsign, setSelAsign] = useState([]); 
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      try {
        const [uRes, tRes] = await Promise.all([
          listarUsuarios({ estado: "Activo", pageSize: 200 }),
          obtenerTarea(tareaId),
        ]);
        const allUsers = (uRes.data?.data || []).filter(u => ["Trabajador", "Tecnico"].includes(u.role || u.rol));
        setUsuarios(allUsers);
        const currentIds = (tRes.data?.asignaciones || []).map(a => String(a.usuario_id || a.usuario?.id));
        setSelAsign(currentIds);
      } catch {
        toast.error("Error cargando datos");
      }
    };
    load();
  }, [open, tareaId]);

  const availableUsers = useMemo(() => {
    const s = q.trim().toLowerCase();
    return usuarios.filter(u => {
        const isAssigned = selAsign.includes(String(u.id));
        const matchesSearch = `${u.nombres} ${u.apellidos}`.toLowerCase().includes(s);
        return !isAssigned && matchesSearch;
    });
  }, [usuarios, selAsign, q]);

  const assignedUsersObjects = useMemo(() => {
      return selAsign.map(id => usuarios.find(u => String(u.id) === id)).filter(Boolean);
  }, [selAsign, usuarios]);

  const handleSave = async () => {
      setLoading(true);
      try {
          await actualizarAsignaciones(tareaId, { usuarios: selAsign.map(Number) });
          toast.success("Equipo actualizado");
          onSaved?.();
          onClose();
      } catch {
          toast.error("Error al guardar");
      } finally {
          setLoading(false);
      }
  };

  const UserRow = ({ u, action }) => (
      <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-all">
          <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${u.role === 'Tecnico' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                  {u.nombres.charAt(0)}{u.apellidos.charAt(0)}
              </div>
              <div>
                  <div className="text-sm font-semibold text-slate-700">{u.nombres} {u.apellidos}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1"><Briefcase size={10}/> {u.role}</div>
              </div>
          </div>
          {action}
      </div>
  );

  return (
    <VentanaModal
      abierto={open}
      cerrar={onClose}
      titulo={<div className="flex items-center gap-2"><Users className="text-blue-600"/> <span>Gestionar Equipo</span></div>}
      footer={
          <>
            <Boton variante="fantasma" onClick={onClose} disabled={loading}>Cancelar</Boton>
            <Boton onClick={handleSave} cargando={loading} disabled={loading}>Confirmar Cambios</Boton>
          </>
      }
      ancho="max-w-5xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[500px]">
          {/* DISPONIBLES */}
          <div className="flex flex-col h-full bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-4 bg-white border-b border-slate-200">
                  <div className="relative">
                      <Search size={14} className="absolute left-3 top-3 text-slate-400"/>
                      <input className="w-full pl-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Buscar..." value={q} onChange={e => setQ(e.target.value)}/>
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {availableUsers.map(u => (
                      <UserRow key={u.id} u={u} action={<button onClick={() => setSelAsign(prev => [...prev, String(u.id)])} className="text-emerald-600 p-2 hover:bg-emerald-50 rounded-lg"><UserPlus size={18}/></button>}/>
                  ))}
              </div>
          </div>
          {/* ASIGNADOS */}
          <div className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-emerald-50/50 flex justify-between items-center">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase flex items-center gap-2"><UserCheck size={14}/> Asignados ({assignedUsersObjects.length})</h4>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {assignedUsersObjects.map(u => (
                      <UserRow key={u.id} u={u} action={<button onClick={() => setSelAsign(prev => prev.filter(x => x !== String(u.id)))} className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg"><UserMinus size={18}/></button>}/>
                  ))}
              </div>
          </div>
      </div>
    </VentanaModal>
  );
}
