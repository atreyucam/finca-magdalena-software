import React from 'react';
import Chart from "react-apexcharts";
import EmptyState from '../../ui/EstadoVacio'; // Asegúrate de tener este componente o quítalo

export default function TareasGestionPanel({ payload }) {
  if (!payload || !payload.operaciones) return <EmptyState>Cargando datos operativos...</EmptyState>;

  const { operaciones, fitosanitario } = payload;
  const { por_tipo, metricas_clave } = operaciones;

  // Gráfico Donut
  const pieOptions = {
    labels: por_tipo.map(t => t.actividad),
    legend: { position: 'bottom' },
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
    dataLabels: { enabled: false }
  };
  const pieSeries = por_tipo.map(t => parseInt(t.total));

  return (
    <div className="mt-6 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. SEMÁFORO FITOSANITARIO */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div>
             <h3 className="font-bold text-slate-800">🛡️ Semáforo Fitosanitario (BPA)</h3>
             <p className="text-xs text-slate-500">Estado de seguridad de lotes basado en Periodos de Carencia</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="p-3 pl-4">Lote</th>
                <th className="p-3">Última Aplicación</th>
                <th className="p-3">Objetivo</th>
                <th className="p-3 text-center">Cosecha (Carencia)</th>
                <th className="p-3 text-center">Reingreso (Seguridad)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {fitosanitario && fitosanitario.length > 0 ? fitosanitario.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="p-3 pl-4 font-medium text-slate-900">{item.lote}</td>
                  <td className="p-3 text-slate-500">{new Date(item.ultima_aplicacion).toLocaleDateString()}</td>
                  <td className="p-3 text-slate-700">{item.plaga_objetivo || "Preventivo"}</td>
                  
                  {/* Semáforo Cosecha */}
                  <td className="p-3 text-center">
                    {item.estado_cosecha === 'BLOQUEADO' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                        ⛔ ESPERAR ({item.dias_para_cosechar} días)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
                        ✅ LIBRE
                      </span>
                    )}
                  </td>

                  {/* Semáforo Reingreso */}
                  <td className="p-3 text-center">
                    {item.estado_reingreso === 'PELIGRO' ? (
                      <span className="text-orange-600 font-bold text-xs bg-orange-50 px-2 py-1 rounded border border-orange-100">⚠️ Usar EPP</span>
                    ) : (
                      <span className="text-slate-400 text-xs">Seguro</span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400 italic">
                    No hay aplicaciones fitosanitarias registradas recientemente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. OPERACIONES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="font-bold text-slate-700 mb-2">Tipos de Tareas Realizadas</h4>
          <Chart options={pieOptions} series={pieSeries} type="donut" height={280} />
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <h4 className="font-bold text-slate-700 mb-6">Métricas de Eficiencia</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl border border-red-100">
              <span className="text-red-700 font-medium">Tareas Atrasadas</span>
              <span className="text-3xl font-bold text-red-800">{metricas_clave.total_atrasadas}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-blue-700 font-medium">Actividades Distintas</span>
              <span className="text-3xl font-bold text-blue-800">{por_tipo.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}