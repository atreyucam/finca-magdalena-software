export default function ReportFilters({
  tab,
  filtros,
  setFiltro,
  cosechas,
  lotes,
  onGenerar,
  loading,
}) {
  return (
    <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
      {/* Filtros generales */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <label className="text-xs font-bold text-slate-500">Cosecha</label>
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={filtros.cosecha_id}
            onChange={(e) => setFiltro("cosecha_id", e.target.value)}
          >
            <option value="">Todas</option>
            {cosechas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre || `Cosecha #${c.id}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500">Lote</label>
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={filtros.lote_id}
            onChange={(e) => setFiltro("lote_id", e.target.value)}
          >
            <option value="">Todos</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre || `Lote #${l.id}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500">Desde</label>
          <input
            type="date"
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={filtros.desde}
            onChange={(e) => setFiltro("desde", e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500">Hasta</label>
          <input
            type="date"
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={filtros.hasta}
            onChange={(e) => setFiltro("hasta", e.target.value)}
          />
        </div>

        <div className="flex items-end">
          <button
            className="w-full px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
            onClick={onGenerar}
            disabled={loading}
          >
            {loading ? "Generando..." : "Generar"}
          </button>
        </div>
      </div>

      {/* Filtros específicos según tab */}
      {tab === "inventario" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500">Categoría</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={filtros.categoria}
              onChange={(e) => setFiltro("categoria", e.target.value)}
            >
              <option value="">Todas</option>
              <option value="Insumo">Insumo</option>
              <option value="Herramienta">Herramienta</option>
              <option value="Equipo">Equipo</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500">Item ID</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={filtros.item_id}
              onChange={(e) => setFiltro("item_id", e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>
      )}

      {tab === "pagos" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500">Trabajador (ID)</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={filtros.usuario_id}
              onChange={(e) => setFiltro("usuario_id", e.target.value)}
              placeholder="Ej: 12"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500">Rol (ID)</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={filtros.role_id}
              onChange={(e) => setFiltro("role_id", e.target.value)}
              placeholder="Ej: 3"
            />
          </div>
        </div>
      )}
    </div>
  );
}
