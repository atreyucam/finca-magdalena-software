import MultiSelectChips from "../../ui/MultiSelectChips";
import Input from "../../ui/Input";
import Boton from "../../ui/Boton";

const PRESETS = [
  { key: "7d", label: "Últimos 7 días" },
  { key: "30d", label: "Últimos 30 días" },
  { key: "mes", label: "Mes actual" },
  { key: "hoy", label: "Hoy" },
];

export default function GlobalReportFilters({
  filters,
  fincasOptions,
  onChange,
  onApply,
  onReset,
  onPreset,
  loading = false,
  note = null,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <MultiSelectChips
            label="Fincas"
            value={filters.finca_ids}
            onChange={(value) => onChange("finca_ids", value)}
            options={fincasOptions}
            placeholder="Todas las fincas activas"
            maxChips={5}
          />
        </div>

        <div className="lg:col-span-2">
          <Input
            label="Desde"
            type="date"
            value={filters.desde}
            onChange={(event) => onChange("desde", event.target.value)}
          />
        </div>

        <div className="lg:col-span-2">
          <Input
            label="Hasta"
            type="date"
            value={filters.hasta}
            onChange={(event) => onChange("hasta", event.target.value)}
          />
        </div>

        <div className="lg:col-span-2 flex items-end gap-2">
          <Boton variante="outline" onClick={onReset} disabled={loading} className="flex-1">
            Limpiar
          </Boton>
          <Boton onClick={onApply} cargando={loading} className="flex-1">
            Consultar
          </Boton>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Boton
            key={preset.key}
            variante="fantasma"
            onClick={() => onPreset(preset.key)}
            disabled={loading}
            className="!px-3 !py-2 text-xs"
          >
            {preset.label}
          </Boton>
        ))}
      </div>

      {note ? <div className="mt-3 text-xs text-slate-500">{note}</div> : null}
    </div>
  );
}
