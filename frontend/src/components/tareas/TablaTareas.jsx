// src/components/tareas/TablaTareas.jsx
import useAuthStore from "../../store/authStore";
import Boton from "../ui/Boton";
import Badge from "../ui/Badge";
import { Tabla, TablaCabecera, TablaHead, TablaCuerpo, TablaFila, TablaCelda, TablaVacia } from "../ui/Tabla";
import { Eye } from "lucide-react";

export default function TablaTareas({ tareas, onVerDetalle, mostrarLote = true }) {
  const { user } = useAuthStore();
  const esTecnicoOProp = ["Tecnico", "Propietario"].includes(user?.role);
  
  // Helper: Obtener iniciales
  const obtenerIniciales = (nombre) => {
    if (!nombre) return "??";
    const partes = nombre.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
  };

  // Helper para asignar variante al Badge
  const getVarianteBadge = (estado) => {
    const estadoLower = (estado || "").toLowerCase();
    switch (estadoLower) {
      case "pendiente": return "pendiente";
      case "asignada": return "asignada";
      case "en progreso": return "en progreso";
      case "completada": return "completada";
      case "verificada": return "verificada";
      case "cancelada": return "cancelada";
      default: return "default";
    }
  };

  const renderAcciones = (t) => {
    const soyAsignado = t.asignados?.some(a => String(a.id) === String(user?.sub || user?.id));

    // 1. Completada -> Verificar (Solo Tecnico/Prop)
    if (t.estado === "Completada") {
      if (esTecnicoOProp) {
         return <Boton variante="violeta" className="!px-3 !py-1.5 text-xs" onClick={() => onVerDetalle(t.id)}>Verificar</Boton>;
      }
      return <span className="text-xs text-slate-400 font-medium">En revisión</span>;
    }

    // 2. Cerrada -> Ver Detalle
    if (["Verificada", "Cancelada"].includes(t.estado)) {
       return (
         <Boton variante="fantasma" className="!px-3 !py-1.5 text-xs border-slate-200 text-slate-600" onClick={() => onVerDetalle(t.id)}>
            Ver Detalle
         </Boton>
       );
    }

    // 3. Activa -> Acción Directa
    if (soyAsignado) {
        return (
            <Boton variante="primario" className="!px-3 !py-1.5 text-xs" onClick={() => onVerDetalle(t.id)}>
               {t.estado === 'En progreso' ? 'Completar' : 'Iniciar'}
            </Boton>
        );
    }
    
    // 4. Gestión (Supervisor)
    if (esTecnicoOProp) {
        return (
            <Boton variante="secundario" className="!px-3 !py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white" onClick={() => onVerDetalle(t.id)}>
               Gestionar
            </Boton>
        );
    }

    return <span className="text-xs text-slate-400 italic">Sólo lectura</span>;
  };

  if (!tareas || tareas.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
        <p className="text-slate-500">No se encontraron tareas con estos filtros.</p>
      </div>
    );
  }

  return (
    <Tabla>
      <TablaCabecera>
        <TablaHead className="w-16">ID</TablaHead>
        <TablaHead>Tipo</TablaHead>
        <TablaHead>Título / Detalle</TablaHead>
        {mostrarLote && <TablaHead>Lote</TablaHead>}
        <TablaHead>Fecha Prog.</TablaHead>
        <TablaHead>Estado</TablaHead>
        <TablaHead>Asignados</TablaHead>
        <TablaHead align="right">Acciones</TablaHead>
      </TablaCabecera>

      <TablaCuerpo>
        {tareas.map((t) => (
          <TablaFila key={t.id}>
            <TablaCelda className="text-slate-500 font-mono text-xs">#{t.id}</TablaCelda>
            
            <TablaCelda>
               <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 border border-slate-200">
                  {t.tipo}
               </span>
            </TablaCelda>

            <TablaCelda className="font-medium text-slate-900">
              {t.titulo || <span className="italic text-slate-400 font-normal">Sin título</span>}
            </TablaCelda>
            
            {mostrarLote && (
              <TablaCelda className="text-slate-600">
                {t.lote}
              </TablaCelda>
            )}
            
            <TablaCelda className="text-slate-600 whitespace-nowrap">
              {t.fecha_programada ? new Date(t.fecha_programada).toLocaleDateString() : "-"}
            </TablaCelda>
            
            <TablaCelda>
              <Badge variante={getVarianteBadge(t.estado)}>
                  {t.estado}
              </Badge>
            </TablaCelda>
            
            {/* ASIGNADOS (Avatares) */}
            <TablaCelda>
              <div className="flex -space-x-2 overflow-hidden items-center">
                {t.asignados?.length > 0 ? (
                  <>
                    {t.asignados.slice(0, 3).map((a, i) => (
                      <div 
                        key={a.id || i} 
                        className="inline-flex h-7 w-7 rounded-full ring-2 ring-white bg-sky-100 items-center justify-center text-[10px] font-bold text-sky-700 cursor-help shadow-sm relative group/avatar" 
                        title={a.nombreCompleto} 
                      >
                        {obtenerIniciales(a.nombreCompleto)}
                      </div>
                    ))}
                    {t.asignados.length > 3 && (
                      <div className="inline-flex h-7 w-7 rounded-full ring-2 ring-white bg-slate-100 items-center justify-center text-[10px] font-medium text-slate-600">
                        +{t.asignados.length - 3}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-slate-400 italic">Sin asignar</span>
                )}
              </div>
            </TablaCelda>

            <TablaCelda align="right">
               {renderAcciones(t)}
            </TablaCelda>
          </TablaFila>
        ))}
      </TablaCuerpo>
    </Tabla>
  );
}