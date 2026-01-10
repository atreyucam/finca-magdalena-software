// frontend/src/components/reportes/panels/TareasAnaliticoPanel.jsx
import Chart from "react-apexcharts";
import Badge from "../../ui/Badge";
import EmptyState from "../../ui/EstadoVacio";
import { BarChart3, Layers, ClipboardList, Crown, Donut } from "lucide-react";

// -------------------------
// Colores (Tailwind palette aproximada a tus badges)
// -------------------------
const COLORS_TAREAS = {
  poda: "#10B981", // emerald-500
  maleza: "#F59E0B", // amber-500
  nutricion: "#3B82F6", // blue-500
  fitosanitario: "#8B5CF6", // violet-500
  enfundado: "#0EA5E9", // sky-500
  cosecha: "#F43F5E", // rose-500
  default: "#64748B", // slate-500
};

// Para estados (misma intención visual que tus clases)
const COLORS_ESTADOS = {
  Pendiente: "#F59E0B", // amber
  Asignada: "#0EA5E9", // sky
  "En progreso": "#3B82F6", // blue
  Completada: "#10B981", // emerald
  Verificada: "#8B5CF6", // violet
  Cancelada: "#F43F5E", // rose
};

// -------------------------
// Card base con header
// -------------------------
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

// -------------------------
// Barras horizontales (Apex)
// -------------------------
function HorizontalBar({ title, icon, items = [], getLabel, getValue, getColor }) {
  const labels = items.map(getLabel);
  const values = items.map((it) => Number(getValue(it) || 0));
  const colors = items.map((it) => getColor?.(it) || "#64748B");

  const series = [{ name: "Total", data: values }];

  const options = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      animations: { enabled: true },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        distributed: true, // 👈 cada barra toma un color diferente
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
    xaxis: {
      categories: labels,
      labels: { style: { fontSize: "12px" } },
    },
    yaxis: {
      labels: { style: { fontSize: "12px" } },
    },
    grid: {
      borderColor: "#E2E8F0", // slate-200
      strokeDashArray: 4,
    },
    tooltip: {
      y: { formatter: (val) => `${val}` },
    },
  };

  return (
    <Card
      title={title}
      icon={icon}
      right={<Badge variante="info">{items.length}</Badge>}
    >
      {!items.length ? (
        <div className="text-sm text-slate-500">Sin datos para mostrar.</div>
      ) : (
        <div className="h-[320px]">
          <Chart options={options} series={series} type="bar" height="100%" />
        </div>
      )}
    </Card>
  );
}

// -------------------------
// Dona por estados (Apex)
// -------------------------
function DonutEstados({ porEstado = {} }) {
  // porEstado esperado: { "Pendiente": 10, "Completada": 5, ... }
  const entries = Object.entries(porEstado || {});

  // orden consistente
  const ORDER = ["Pendiente", "Asignada", "En progreso", "Completada", "Verificada", "Cancelada"];
  entries.sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]));

  const labels = entries.map(([k]) => k);
  const values = entries.map(([, v]) => Number(v));
  const colors = labels.map((l) => COLORS_ESTADOS[l] || "#64748B");

  const options = {
    chart: { type: "donut" },
    labels,
    colors,
    legend: {
      position: "bottom",
      fontSize: "12px",
      markers: { width: 10, height: 10, radius: 10 },
    },
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
      {values.length === 0 ? (
        <div className="text-sm text-slate-500">Sin datos para mostrar.</div>
      ) : (
        <div className="h-[320px]">
          <Chart options={options} series={values} type="donut" height="100%" />
        </div>
      )}
    </Card>
  );
}

// -------------------------
// Lista (la tuya) para mantener respaldo
// -------------------------
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
          <div className="text-sm text-slate-500">Sin datos para mostrar.</div>
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
    return (
      <EmptyState>
        No hay estadísticas disponibles. Realiza una consulta para generarlas.
      </EmptyState>
    );
  }

  const totalFinca = Number(stats.total_finca || 0);
  const rankingTareas = Array.isArray(stats.ranking_tareas) ? stats.ranking_tareas : [];
  const rankingLotes = Array.isArray(stats.ranking_lotes) ? stats.ranking_lotes : [];
  const dominantes = Array.isArray(stats.tarea_mas_realizada_por_lote)
    ? stats.tarea_mas_realizada_por_lote
    : [];

  // ✅ si el backend aún no devuelve esto, quedará vacío sin romper UI
  const porEstado = stats.por_estado || {};

  // UX: si hay muy pocos datos, lista se ve mejor que gráfico
  const showCharts = true;

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

          <Badge variante={totalFinca > 0 ? "success" : "warning"}>
            {totalFinca > 0 ? "Con datos" : "Sin datos"}
          </Badge>
        </div>
      </div>

      {/* ✅ Gráficos (cuando ya hay volumen) */}
      {showCharts && (
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
            // lotes: colores “rotativos” usando los de tareas (para variar sin inventar paleta)
            getColor={(it) => {
              const idx = Number(it.lote_id || 0) % 6;
              const pool = ["poda", "maleza", "nutricion", "fitosanitario", "enfundado", "cosecha"];
              return COLORS_TAREAS[pool[idx]] || COLORS_TAREAS.default;
            }}
          />

          <DonutEstados porEstado={porEstado} />
        </div>
      )}

      {/* ✅ Listas (si hay pocos datos o como respaldo) */}
      {!showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TopList
            title="Ranking de tareas (Top)"
            icon={<ClipboardList className="h-5 w-5 text-slate-700" />}
            items={rankingTareas}
            renderItem={(it, idx) => (
              <>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">
                    #{idx + 1} — {it.nombre || it.codigo}
                  </div>
                  <div className="text-xs text-slate-500">Código: {it.codigo}</div>
                </div>
                <Badge variante="info">{Number(it.total || 0)}</Badge>
              </>
            )}
          />

          <TopList
            title="Ranking de lotes (Top)"
            icon={<Layers className="h-5 w-5 text-slate-700" />}
            items={rankingLotes}
            renderItem={(it, idx) => (
              <>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">
                    #{idx + 1} — {it.lote || `Lote #${it.lote_id}`}
                  </div>
                  <div className="text-xs text-slate-500">ID: {it.lote_id}</div>
                </div>
                <Badge variante="info">{Number(it.total || 0)}</Badge>
              </>
            )}
          />
        </div>
      )}

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
