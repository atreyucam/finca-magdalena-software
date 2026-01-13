// frontend/src/components/reportes/panels/TareasAnaliticoPanel.jsx
import Badge from "../../ui/Badge";
import ReportEmptyState from "../ui/ReportEmptyState";
import ApexChart from "../../ui/ApexChart";
import { BarChart3, Layers, ClipboardList, Crown, Donut } from "lucide-react";

// -------------------------
// Colores (Apex necesita HEX)
// -------------------------
const COLORS_TAREAS = {
  poda: "#10B981",
  maleza: "#F59E0B",
  nutricion: "#3B82F6",
  fitosanitario: "#8B5CF6",
  enfundado: "#0EA5E9",
  cosecha: "#F43F5E",
  default: "#64748B",
};

const COLORS_ESTADOS = {
  Pendiente: "#F59E0B",
  Asignada: "#0EA5E9",
  "En progreso": "#3B82F6",
  Completada: "#10B981",
  Verificada: "#8B5CF6",
  Cancelada: "#F43F5E",
};

function Card({ title, icon, right, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
            {icon}
          </div>
          <div className="text-sm font-extrabold text-slate-900">{title}</div>
        </div>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function HorizontalBar({ title, icon, items = [], getLabel, getValue, getColor }) {
  const labels = items.map(getLabel);
  const values = items.map((it) => Number(getValue(it) || 0));
  const colors = items.map((it) => getColor?.(it) || COLORS_TAREAS.default);

  const series = [{ name: "Total", data: values }];

  const options = {
    chart: { type: "bar", toolbar: { show: false }, animations: { enabled: true } },
    plotOptions: {
      bar: {
        horizontal: true,
        distributed: true,
        barHeight: "70%",
        borderRadius: 8,
      },
    },
    colors,
    dataLabels: {
      enabled: true,
      style: { fontSize: "12px", fontWeight: 700 },
      formatter: (val) => `${val}`,
    },
    xaxis: { categories: labels, labels: { style: { fontSize: "12px" } } },
    yaxis: { labels: { style: { fontSize: "12px" } } },
    grid: { borderColor: "#E2E8F0", strokeDashArray: 4 },
    tooltip: { y: { formatter: (val) => `${val}` } },
  };

  return (
    <Card title={title} icon={icon} right={<Badge variante="info">{items.length}</Badge>}>
      {!items.length ? (
        <ReportEmptyState variant="empty" />
      ) : (
        <ApexChart type="bar" series={series} options={options} height={320} />
      )}
    </Card>
  );
}

function DonutEstados({ porEstado = {} }) {
  const entries = Object.entries(porEstado || {});
  const ORDER = ["Pendiente", "Asignada", "En progreso", "Completada", "Verificada", "Cancelada"];
  entries.sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]));

  const labels = entries.map(([k]) => k);
  const values = entries.map(([, v]) => Number(v));
  const colors = labels.map((l) => COLORS_ESTADOS[l] || COLORS_TAREAS.default);

  const options = {
    chart: { type: "donut", toolbar: { show: false } },
    labels,
    colors,
    legend: { position: "bottom", fontSize: "12px", markers: { width: 10, height: 10, radius: 10 } },
    dataLabels: { enabled: true },
    tooltip: { y: { formatter: (val) => `${val}` } },
    stroke: { width: 2, colors: ["#fff"] },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total",
              formatter: () => values.reduce((a, b) => a + b, 0),
            },
          },
        },
      },
    },
  };

  return (
    <Card
      title="Distribución por estado"
      icon={<Donut className="h-5 w-5 text-slate-700" />}
      right={<Badge variante="info">{values.reduce((a, b) => a + b, 0)}</Badge>}
    >
      {values.length === 0 ? <ReportEmptyState variant="empty" /> : <ApexChart type="donut" series={values} options={options} height={320} />}
    </Card>
  );
}

function TopList({ title, icon, items = [], renderItem }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
            {icon}
          </div>
          <div className="text-sm font-extrabold text-slate-900">{title}</div>
        </div>
        <Badge variante="info">{items.length}</Badge>
      </div>

      <div className="p-4">
        {!items.length ? (
          <ReportEmptyState variant="empty" />
        ) : (
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                {renderItem(it, idx)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TareasAnaliticoPanel({ stats, loading = false }) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Badge variante="info">Cargando...</Badge>
          Generando estadísticas...
        </div>
      </div>
    );
  }

  if (!stats) {
    return <ReportEmptyState variant="idle" />;
  }

  const totalFinca = Number(stats.total_finca || 0);
  const rankingTareas = Array.isArray(stats.ranking_tareas) ? stats.ranking_tareas : [];
  const rankingLotes = Array.isArray(stats.ranking_lotes) ? stats.ranking_lotes : [];
  const dominantes = Array.isArray(stats.tarea_mas_realizada_por_lote) ? stats.tarea_mas_realizada_por_lote : [];
  const porEstado = stats.por_estado || {};

  return (
    <div className="space-y-4">
      {/* Total */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase">
                Total de tareas (universo filtrado)
              </div>
              <div className="text-2xl font-extrabold text-slate-900 leading-tight">
                {totalFinca}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Estos números no cambian al paginar (son globales según filtros).
              </div>
            </div>
          </div>

          <Badge variante={totalFinca > 0 ? "exito" : "warning"}>
            {totalFinca > 0 ? "Con datos" : "Sin datos"}
          </Badge>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <HorizontalBar
          title="Ranking de tareas (Top)"
          icon={<ClipboardList className="h-5 w-5 text-slate-700" />}
          items={rankingTareas}
          getLabel={(it) => it.nombre || it.codigo}
          getValue={(it) => it.total}
          getColor={(it) => COLORS_TAREAS[String(it.codigo || "").toLowerCase()] || COLORS_TAREAS.default}
        />

        <HorizontalBar
          title="Ranking de lotes (Top)"
          icon={<Layers className="h-5 w-5 text-slate-700" />}
          items={rankingLotes}
          getLabel={(it) => it.lote || `Lote #${it.lote_id}`}
          getValue={(it) => it.total}
          getColor={(it) => {
            const idx = Number(it.lote_id || 0) % 6;
            const pool = ["poda", "maleza", "nutricion", "fitosanitario", "enfundado", "cosecha"];
            return COLORS_TAREAS[pool[idx]] || COLORS_TAREAS.default;
          }}
        />

        <DonutEstados porEstado={porEstado} />
      </div>

      {/* Dominante por lote */}
      <TopList
        title="Tarea más realizada por lote"
        icon={<Crown className="h-5 w-5 text-slate-700" />}
        items={dominantes}
        renderItem={(it) => (
          <>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 truncate">
                {it.lote || `Lote #${it.lote_id}`}
              </div>
              <div className="text-xs text-slate-500">
                Dominante: {it.tipo_nombre || it.tipo_codigo}
              </div>
            </div>
            <Badge variante="warning">{Number(it.total || 0)}</Badge>
          </>
        )}
      />
    </div>
  );
}
