import React from 'react';
import Chart from "react-apexcharts";
import EmptyState from '../../ui/EstadoVacio';

const Kpi = ({ label, val, sub }) => (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-slate-800 mt-1">{val}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
);

export default function ProduccionPanel({ payload }) {
  if (!payload || !payload.indicadores_clave) return <EmptyState>Selecciona una cosecha para ver el rendimiento.</EmptyState>;

  const { indicadores_clave, analisis_calidad, ranking_lotes, cosecha } = payload;

  // Gráfico Calidad
  const qualitySeries = [indicadores_clave.kg_export, indicadores_clave.kg_nacional, indicadores_clave.kg_rechazo];
  const qualityOptions = {
    labels: ['Exportación', 'Nacional', 'Rechazo'],
    colors: ['#10b981', '#3b82f6', '#ef4444'],
    legend: { position: 'bottom' }
  };

  // Gráfico Rechazos (Pareto)
  const rechazosData = analisis_calidad?.rechazos_pareto || [];
  const rechazoOptions = {
    chart: { toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
    xaxis: { categories: rechazosData.map(r => r.causa) },
    colors: ['#ef4444']
  };
  const rechazoSeries = [{ name: 'Kg', data: rechazosData.map(r => Number(r.total_kg)) }];

  return (
    <div className="mt-6 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Cosecha: {cosecha.codigo}</h2>
            <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium">Activa</span>
        </div>

        {/* KPIs Generales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Kpi label="Kg Planificados" val={indicadores_clave.kg_plan} sub="Proyección" />
            <Kpi label="Kg Cosechados" val={indicadores_clave.kg_real} sub={`${indicadores_clave.porcentaje_cumplimiento}% Cump.`} />
            <Kpi label="% Exportable" val={`${indicadores_clave.porcentaje_exportable}%`} sub={`${indicadores_clave.kg_export} kg`} />
            <Kpi label="Ingreso Est." val={`$${indicadores_clave.dinero_total}`} sub="Liquidación" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Calidad */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-700 mb-2">Calidad de Fruta</h4>
                <Chart options={qualityOptions} series={qualitySeries} type="donut" height={250} />
            </div>

            {/* Causas de Rechazo */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm md:col-span-2">
                <h4 className="font-bold text-slate-700 mb-2">Análisis de Rechazos</h4>
                {rechazosData.length > 0 ? (
                    <Chart options={rechazoOptions} series={rechazoSeries} type="bar" height={250} />
                ) : <p className="text-slate-400 py-10 text-center">Sin rechazos registrados.</p>}
            </div>
        </div>

        {/* Ranking de Lotes */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h4 className="font-bold text-slate-800">🏆 Top Rendimiento por Lote</h4>
            </div>
            <table className="w-full text-sm">
                <thead className="text-slate-500 bg-white border-b border-slate-100">
                    <tr>
                        <th className="p-3 text-left pl-4">Lote</th>
                        <th className="p-3 text-right">Superficie</th>
                        <th className="p-3 text-right">Kg Totales</th>
                        <th className="p-3 text-right bg-emerald-50 text-emerald-800">Rendimiento (Kg/Ha)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {ranking_lotes?.map((l, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                            <td className="p-3 pl-4 font-medium">{l.lote}</td>
                            <td className="p-3 text-right text-slate-500">{l.superficie_ha} ha</td>
                            <td className="p-3 text-right">{l.kg}</td>
                            <td className="p-3 text-right font-bold text-emerald-700 bg-emerald-50/30">{l.rendimiento}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

    </div>
  );
}