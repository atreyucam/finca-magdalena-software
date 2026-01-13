// frontend/src/components/reportes/ui/ReportPanelLayout.jsx
import Boton from "../../ui/Boton";

function MetaChips({ items = [] }) {
  if (!items?.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((it, idx) => (
        <div
          key={`${it.label}-${idx}`}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
        >
          <span className="font-semibold text-slate-600">{it.label}:</span>
          <span className="text-slate-900">{it.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReportPanelLayout({
  title,
  description,
  meta = [],

  primaryAction = null, // { label, onClick, disabled, icon, variant, loading }
  secondaryAction = null, // { label, onClick, disabled, icon, variant, loading }
  headerRight = null,

  filters = null, // JSX

  wrapResults = true, // ✅ si false, no crea la card de resultados
  resultsClassName = "",
  children,
}) {
  const ResultsWrapper = ({ children: ch }) =>
    wrapResults ? (
      <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${resultsClassName}`}>
        {ch}
      </div>
    ) : (
      <div className={resultsClassName}>{ch}</div>
    );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between py-5">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          <MetaChips items={meta} />
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          {headerRight}

          {secondaryAction ? (
            <Boton
              variante={secondaryAction.variant || "outline"}
              icono={secondaryAction.icon}
              onClick={secondaryAction.onClick}
              disabled={!!secondaryAction.disabled}
              cargando={!!secondaryAction.loading}
              className="whitespace-nowrap"
            >
              {secondaryAction.label}
            </Boton>
          ) : null}

          {primaryAction ? (
            <Boton
              variante={primaryAction.variant || "primario"}
              icono={primaryAction.icon}
              onClick={primaryAction.onClick}
              disabled={!!primaryAction.disabled}
              cargando={!!primaryAction.loading}
              className="whitespace-nowrap"
            >
              {primaryAction.label}
            </Boton>
          ) : null}
        </div>
      </div>

      {/* Filters */}
      {filters ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {filters}
        </div>
      ) : null}

      {/* Results */}
      <ResultsWrapper>{children}</ResultsWrapper>
    </div>
  );
}
