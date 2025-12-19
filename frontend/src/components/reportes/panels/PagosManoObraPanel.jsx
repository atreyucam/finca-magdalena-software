import React from 'react';
import Chart from "react-apexcharts";
import EmptyState from '../../ui/EstadoVacio';

export default function PagosManoObraPanel({ payload }) {
  if (!payload) return <EmptyState>Sin datos de costos.</EmptyState>;

  const { distribucion_gasto, costos_por_lote, total_nomina_periodo, consumo_insumos } = payload;

  const pieOptions = {
    labels: distribucion_gasto.labels,
    colors: ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e'],
    legend: { position: 'bottom' },
    tooltip: { y: { formatter: (val) => `$${val}` } }
  };

  return (
    <div className="mt-6 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* TARJETA TOTAL */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-6 rounded-2xl shadow-lg flex justify-between items-center">
        <div>
          <p className="text-indigo-200 font-medium text-sm">Gasto Total Nómina (Periodo)</p>
          <h2 className="text-4xl font-extrabold mt-1 tracking-tight">${total_nomina_periodo}</h2>
        </div>
        <div className="hidden sm:block text-right">
          <span className="bg-white/20 px-3 py-1 rounded-lg text-sm font-medium backdrop-blur-sm">Costo Real</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* GRÁFICO ABC */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Gasto por Actividad (ABC)</h3>
          {distribucion_gasto.series.length > 0 ? (
             <Chart options={pieOptions} series={distribucion_gasto.series} type="donut" height={300} />
          ) : (
             <p className="text-slate-400 text-center py-10">No hay gastos registrados en este periodo.</p>
          )}
        </div>

        {/* TABLA EFICIENCIA */}
        <div className="bg-white p-0 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
             <h3 className="font-bold text-slate-800">Costos por Lote</h3>
             <span className="text-xs bg-white border border-slate-200 px-2 py-1 rounded text-slate-500">Ranking</span>
          </div>
          <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-white text-slate-500 border-b border-slate-100 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left bg-slate-50">Lote</th>
                  <th className="px-4 py-3 text-right bg-slate-50">Costo Total</th>
                  <th className="px-4 py-3 text-right bg-indigo-50 text-indigo-900">Costo / Ha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {costos_por_lote.map((lote, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-700">{lote.lote}</td>
                    <td className="px-4 py-3 text-right text-slate-600">${lote.costo_total_asignado}</td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-700 bg-indigo-50/30">
                      ${lote.costo_por_ha}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* INSUMOS */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4">Consumo de Insumos</h3>
        <div className="flex flex-wrap gap-3">
            {consumo_insumos.length > 0 ? consumo_insumos.map((i, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-sm">
                    <span className="font-semibold text-slate-700">{i.insumo}</span>
                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs">
                       {i.cantidad} {i.unidad}
                    </span>
                </div>
            )) : (
                <p className="text-slate-400 text-sm italic">No hay salidas de bodega vinculadas a tareas en este periodo.</p>
            )}
        </div>
      </div>
    </div>
  );
}