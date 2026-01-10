// frontend/src/components/reportes/MiniTabs.jsx
const TABS = [
  { key: "analitico", label: "Analítico" },
  { key: "detalle", label: "Detalle" },
];

export default function MiniTabs({ tab, setTab, className = "" }) {
  return (
    <div
      className={[
        "flex flex-wrap gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200 w-fit",
        className,
      ].join(" ")}
    >
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => setTab(t.key)}
          className={[
            "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition",
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
