import React from 'react';
import { Link } from 'react-router-dom'; // 👈 IMPORTANTE: Importar Link
import useAuth from "../hooks/useAuth";
import useDashboard from "../hooks/useDashboard";
import { 
  ShieldCheck, 
  AlertTriangle, 
  DollarSign, 
  Sprout, 
  ClipboardList, 
  RefreshCcw 
} from "lucide-react";

// Componente de Tarjeta KPI (Sin cambios)
const KpiCard = ({ title, value, subtitle, icon: Icon, color, loading }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-wide">{title}</p>
        {loading ? (
          <div className="h-8 w-24 bg-slate-100 animate-pulse rounded mt-1"></div>
        ) : (
          <h3 className="text-3xl font-extrabold text-slate-900">{value}</h3>
        )}
        {subtitle && (
          <p className={`text-xs font-medium mt-2 flex items-center gap-1 ${color}`}>
            {subtitle}
          </p>
        )}
      </div>
      <div className={`p-3 rounded-xl ${color.replace('text-', 'bg-').replace('600', '50').replace('700', '50')}`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, recargar } = useDashboard();

  const { 
    kpi_seguridad = { lotes_bloqueados: 0, mensaje: "..." },
    kpi_finanzas = { gasto_mes_actual: "0.00" },
    kpi_produccion = { kg_totales_campana: 0, porcentaje_exportable: 0 },
    kpi_operativo = { tareas_atrasadas: 0, estado_general: "Normal" }
  } = data || {};

  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Hola, {user?.nombres?.split(" ")[0] || "Usuario"} 👋
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Resumen integral de operaciones y seguridad.
            </p>
          </div>
          
          <button 
            onClick={recargar}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors text-sm font-medium"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-xl">
            Error: {error}
          </div>
        )}

        {/* --- GRID DE KPIs --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard 
            title="Seguridad (BPA)"
            value={kpi_seguridad.lotes_bloqueados === 0 ? "100%" : `${kpi_seguridad.lotes_bloqueados} Lotes`}
            subtitle={kpi_seguridad.mensaje}
            icon={kpi_seguridad.lotes_bloqueados > 0 ? AlertTriangle : ShieldCheck}
            color={kpi_seguridad.lotes_bloqueados > 0 ? "text-red-600" : "text-emerald-600"}
            loading={loading}
          />
          <KpiCard 
            title="Gasto Operativo (Mes)"
            value={`$${kpi_finanzas.gasto_mes_actual}`}
            subtitle="Nómina + Insumos"
            icon={DollarSign}
            color="text-slate-600"
            loading={loading}
          />
          <KpiCard 
            title="Producción Activa"
            value={`${Number(kpi_produccion.kg_totales_campana).toLocaleString()} kg`}
            subtitle={`${kpi_produccion.porcentaje_exportable}% Calidad Exportable`}
            icon={Sprout}
            color="text-blue-600"
            loading={loading}
          />
          <KpiCard 
            title="Gestión de Tareas"
            value={kpi_operativo.tareas_atrasadas}
            subtitle={kpi_operativo.tareas_atrasadas > 0 ? "Tareas Atrasadas" : "Al día"}
            icon={ClipboardList}
            color={kpi_operativo.tareas_atrasadas > 5 ? "text-orange-600" : "text-emerald-600"}
            loading={loading}
          />
        </div>

        {/* --- Accesos Directos a Reportes Detallados --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white shadow-lg md:col-span-2">
                <h3 className="text-xl font-bold mb-2">📊 Análisis de Rendimiento</h3>
                <p className="text-emerald-100 mb-6 max-w-md">
                    Consulta el detalle de lotes, mapas de calor de producción y causas de rechazo en el reporte completo.
                </p>
                {/* 👇 CAMBIO AQUÍ: Usamos Link en lugar de a href */}
                <Link 
                  to="/reportes/produccion" 
                  className="inline-block bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 px-5 py-2.5 rounded-xl text-sm font-semibold transition"
                >
                    Ver Reporte de Producción →
                </Link>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-center items-center text-center">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                    <ShieldCheck size={24} />
                </div>
                <h3 className="font-bold text-slate-800">Semáforo Fitosanitario</h3>
                <p className="text-sm text-slate-500 mt-2 mb-4">
                    Verifica qué lotes cumplen con los periodos de carencia antes de cosechar.
                </p>
                {/* 👇 CAMBIO AQUÍ: Usamos Link en lugar de a href */}
                <Link 
                  to="/reportes" 
                  className="text-blue-600 text-sm font-semibold hover:underline"
                >
                    Ir al Semáforo →
                </Link>
            </div>
        </div>

      </div>
    </section>
  );
}