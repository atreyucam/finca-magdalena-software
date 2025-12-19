// src/components/tareas/ResumenTareas.jsx
import React from 'react';

export default function ResumenTareas({ total, porGrupo = {}, filtroActivo, setFiltro }) {
  
  const Card = ({ titulo, valor, colorBg, colorText, grupo }) => {
    // Verificamos si este card es el filtro activo
    const isSelected = filtroActivo === grupo;
    
    // Si es "Total", el grupo suele ser vacío ""
    // Si isSelected es true, añadimos un anillo de borde para resaltar
    
    return (
      <div
        onClick={() => setFiltro && setFiltro(grupo)}
        className={`
          flex flex-col justify-between
          rounded-2xl border p-4 cursor-pointer transition-all duration-200 hover:shadow-md select-none
          ${colorBg} ${colorText}
          ${isSelected ? "border-slate-400 ring-2 ring-slate-400/50 ring-offset-1" : "border-slate-200"}
        `}
      >
        <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">
          {titulo}
        </div>
        <div className="mt-2 text-3xl font-bold tracking-tight">
          {valor || 0}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 mb-6">
      <Card 
        titulo="Total" 
        valor={total} 
        colorBg="bg-white" 
        colorText="text-slate-800" 
        grupo="" // Filtro vacío = Ver todo
      />
      <Card 
        titulo="Pendientes" 
        valor={porGrupo.Pendientes} 
        colorBg="bg-amber-50" 
        colorText="text-amber-700" 
        grupo="Pendientes" 
      />
      <Card 
        titulo="En Progreso" 
        valor={porGrupo["En progreso"]} 
        colorBg="bg-sky-50" 
        colorText="text-sky-700" 
        grupo="En progreso" 
      />
      <Card 
        titulo="Completadas" 
        valor={porGrupo.Completadas} 
        colorBg="bg-emerald-50" 
        colorText="text-emerald-700" 
        grupo="Completadas" 
      />
      <Card 
        titulo="Verificadas" 
        valor={porGrupo.Verificadas} 
        colorBg="bg-violet-50" 
        colorText="text-violet-700" 
        grupo="Verificadas" 
      />
      <Card 
        titulo="Canceladas" 
        valor={porGrupo.Canceladas} 
        colorBg="bg-rose-50" 
        colorText="text-rose-700" 
        grupo="Canceladas" 
      />
    </div>
  );
}