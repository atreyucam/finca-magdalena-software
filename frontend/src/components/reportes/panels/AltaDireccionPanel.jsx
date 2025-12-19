import React from 'react';

const KpiCard = ({ title, value, subtitle, icon, colorClass }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between transition hover:shadow-md">
    <div>
      <p className="text-sm font-bold text-slate-500 mb-1">{title}</p>
      <h3 className="text-2xl font-extrabold text-slate-900">{value}</h3>
      {subtitle && <p className={`text-xs font-medium mt-2 ${colorClass}`}>{subtitle}</p>}
    </div>
    <div className="p-3 bg-slate-50 rounded-xl text-2xl filter grayscale opacity-80">
      {icon}
    </div>
  </div>
);

export default function AltaDireccionPanel({ payload }) {
  if (!payload) return null;
  const { kpi_seguridad, kpi_finanzas, kpi_produccion, kpi_operativo } = payload;

  return (
    <div className="mt-6 animate-in fade-in duration-500 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <KpiCard 
          title="Seguridad Fitosanitaria"
          value={kpi_seguridad.lotes_bloqueados === 0 ? "100% Seguro" : `${kpi_seguridad.lotes_bloqueados} Lotes Bloq.`}
          subtitle={kpi_seguridad.mensaje}
          colorClass={kpi_seguridad.lotes_bloqueados > 0 ? "text-red-600 font-bold" : "text-emerald-600 font-bold"}
          icon="🛡️"
        />

        <KpiCard 
          title="Gasto Operativo (Mes)"
          value={`$${kpi_finanzas.gasto_mes_actual}`}
          subtitle="Nómina + Costos directos"
          colorClass="text-slate-600"
          icon="💸"
        />

        <KpiCard 
          title="Producción Activa"
          value={`${kpi_produccion.kg_totales_campana} kg`}
          subtitle={`${kpi_produccion.porcentaje_exportable}% Exportable`}
          colorClass="text-blue-600 font-bold"
          icon="⚖️"
        />

        <KpiCard 
          title="Tareas Pendientes"
          value={kpi_operativo.tareas_atrasadas}
          subtitle={`Estado: ${kpi_operativo.estado_general}`}
          colorClass={kpi_operativo.tareas_atrasadas > 5 ? "text-orange-600 font-bold" : "text-slate-500"}
          icon="🚜"
        />
      </div>
      
      <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center">
         <p className="text-slate-500 text-sm">
           💡 Selecciona las pestañas superiores para ver el detalle técnico de cada área.
         </p>
      </div>
    </div>
  );
}