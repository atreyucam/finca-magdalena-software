import Chart from "react-apexcharts";
// import KpiCard from "../KpiCard";
// import EmptyState from "../EmptyState";

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export default function InventarioResumenPanel({ payload }) {
  if (!payload) {
    return (
      <EmptyState>
        Genera el reporte para ver el resumen de inventario.
      </EmptyState>
    );
  }

  const resumen = payload.resumen || {};
  const items = payload.por_item || [];

  if (items.length === 0) {
    return (
      <EmptyState>
        {payload.mensaje || "No se encontraron ítems para los filtros aplicados."}
      </EmptyState>
    );
  }

  const bajo = items.filter((i) => i.bajo_minimo).length;

  const topStock = [...items]
    .sort((a, b) => n(b.stock_actual) - n(a.stock_actual))
    .slice(0, 8);

  const stockChart = {
    options: {
      chart: { toolbar: { show: false } },
      xaxis: { categories: topStock.map((i) => i.nombre) },
      dataLabels: { enabled: false },
      tooltip: {
        y: { formatter: (v) => Number(v).toFixed(2) },
      },
    },
    series: [
      {
        name: "Stock actual",
        data: topStock.map((i) => n(i.stock_actual)),
      },
    ],
  };

  return (
    <div className="mt-4 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          title="Items totales"
          value={resumen.total_items}
          subtitle="Inventario analizado"
        />
        <KpiCard
          title="Bajo stock mínimo"
          value={resumen.items_bajo_minimo}
        />
        <KpiCard
          title="Sin movimientos"
          value={resumen.items_sin_movimiento}
        />
        <KpiCard
          title="% bajo mínimo"
          value={
            resumen.total_items > 0
              ? ((bajo / resumen.total_items) * 100).toFixed(1) + "%"
              : "—"
          }
        />
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-bold text-slate-700 mb-2">
          Top items por stock actual
        </div>
        <Chart
          type="bar"
          options={stockChart.options}
          series={stockChart.series}
          height={280}
        />
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm overflow-x-auto">
        <div className="text-sm font-bold text-slate-700 mb-2">
          Detalle por item
        </div>
        <table className="min-w-[900px] w-full text-sm">
          <thead className="text-slate-500 border-b">
            <tr>
              <th className="text-left py-2">Item</th>
              <th className="text-left py-2">Categoría</th>
              <th className="text-right py-2">Stock actual</th>
              <th className="text-right py-2">Stock mínimo</th>
              <th className="text-right py-2">Entradas (base)</th>
              <th className="text-right py-2">Salidas (base)</th>
              <th className="text-right py-2">Saldo movimientos</th>
              <th className="text-left py-2">Estado</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {items.map((i) => {
              const badge = i.bajo_minimo
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200";
              const text = i.bajo_minimo ? "Bajo mínimo" : "OK";

              return (
                <tr key={i.item_id} className="border-b last:border-b-0">
                  <td className="py-2 font-semibold">{i.nombre}</td>
                  <td className="py-2">{i.categoria}</td>
                  <td className="py-2 text-right">
                    {n(i.stock_actual).toFixed(3)}
                  </td>
                  <td className="py-2 text-right">
                    {n(i.stock_minimo).toFixed(3)}
                  </td>
                  <td className="py-2 text-right">
                    {n(i.total_entradas_base).toFixed(3)}
                  </td>
                  <td className="py-2 text-right">
                    {n(i.total_salidas_base).toFixed(3)}
                  </td>
                  <td className="py-2 text-right">
                    {n(i.saldo_movimientos_base).toFixed(3)}
                  </td>
                  <td className="py-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs ${badge}`}
                    >
                      {text}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
