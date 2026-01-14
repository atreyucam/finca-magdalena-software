const TABS = [
  { key: "alta", label: "Alta dirección" },
  { key: "produccion", label: "Producción / Cosecha" },
  { key: "tareas", label: "Tareas" },
  { key: "inventario", label: "Inventario" },
  { key: "pagos", label: "Mano de obra" },
];

export default function ReportTabs({ tab, setTab }) {
  return (
    <div className="mt-5 flex flex-wrap gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200 w-fit">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          className={[
            "px-4 py-2 rounded-lg text-sm font-semibold transition",
            tab === t.key
              ? "bg-white border border-slate-200 shadow-sm text-slate-800"
              : "text-slate-500 hover:text-slate-700",
          ].join(" ")}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
