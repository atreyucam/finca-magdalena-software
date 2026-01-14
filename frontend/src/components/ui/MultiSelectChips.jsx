import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X, Check, Search } from "lucide-react";

/**
 * MultiSelect con chips + buscador
 * - value: array (ids)
 * - options: [{value, label}]
 */
export default function MultiSelectChips({
  label,
  value = [],
  onChange,
  options = [],
  placeholder = "Selecciona...",
  tip = null,
  maxChips = 6,
  disabled = false,
  error = null,
  className = "",
  contenedorClass = "",
}) {
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selectedSet = useMemo(() => new Set(value.map(String)), [value]);

  const selectedOptions = useMemo(() => {
    const map = new Map(options.map((o) => [String(o.value), o]));
    return value.map((v) => map.get(String(v))).filter(Boolean);
  }, [options, value]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => String(o.label).toLowerCase().includes(term));
  }, [options, q]);

  const allSelected = useMemo(() => {
    if (!options.length) return false;
    return value.length === options.length;
  }, [value, options]);

  const toggle = (val) => {
    const k = String(val);
    const next = new Set(selectedSet);
    if (next.has(k)) next.delete(k);
    else next.add(k);

    // devuelve en el mismo tipo que venía (número si era número)
    const raw = Array.from(next);
    const normalized = raw.map((x) => {
      const opt = options.find((o) => String(o.value) === String(x));
      return opt ? opt.value : x;
    });
    onChange?.(normalized);
  };

  const clearAll = () => onChange?.([]);

  const selectAll = () => {
    const next = options.map((o) => o.value);
    onChange?.(next);
  };

  // click outside
  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // focus input when open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      setQ("");
    }
  };

  return (
    <div className={`w-full ${contenedorClass}`} ref={wrapRef} onKeyDown={onKeyDown}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
          {label}
        </label>
      )}

      {/* Control */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((s) => !s)}
        className={`
          w-full text-left rounded-xl border bg-white px-3 py-2.5
          focus:outline-none focus:ring-2 transition-all
          disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed
          ${error ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200" : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-100"}
          ${className}
        `}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Chips / Placeholder */}
          <div className="flex flex-wrap items-center gap-2 min-h-[22px]">
            {selectedOptions.length ? (
              <>
                {selectedOptions.slice(0, maxChips).map((o) => (
                  <span
                    key={String(o.value)}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-1 text-xs font-semibold"
                    onClick={(e) => {
                      // evitar que el click del chip cierre/abra
                      e.preventDefault();
                      e.stopPropagation();
                      toggle(o.value);
                    }}
                  >
                    {o.label}
                    <X size={14} className="opacity-70" />
                  </span>
                ))}
                {selectedOptions.length > maxChips ? (
                  <span className="text-xs font-semibold text-slate-500">
                    +{selectedOptions.length - maxChips}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-sm text-slate-500">{placeholder}</span>
            )}
          </div>

          <ChevronDown
            size={18}
            className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="relative">
          <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            {/* Search + actions */}
            <div className="p-3 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={inputRef}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar finca..."
                    className="
                      w-full rounded-xl border border-slate-200 bg-white
                      py-2 pl-9 pr-3 text-sm text-slate-900
                      focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500
                    "
                  />
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    allSelected ? clearAll() : selectAll();
                  }}
                  className="
                    rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700
                    hover:bg-slate-50
                  "
                >
                  {allSelected ? "Quitar todo" : "Seleccionar todo"}
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="max-h-64 overflow-auto p-2">
              {filtered.length ? (
                filtered.map((o) => {
                  const isOn = selectedSet.has(String(o.value));
                  return (
                    <button
                      key={String(o.value)}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggle(o.value);
                      }}
                      className={`
                        w-full flex items-center justify-between gap-3
                        rounded-xl px-3 py-2 text-sm
                        ${isOn ? "bg-emerald-50" : "hover:bg-slate-50"}
                      `}
                    >
                      <span className={`font-medium ${isOn ? "text-emerald-900" : "text-slate-800"}`}>
                        {o.label}
                      </span>
                      <span
                        className={`
                          inline-flex h-5 w-5 items-center justify-center rounded-full border
                          ${isOn ? "border-emerald-300 bg-emerald-600 text-white" : "border-slate-300 bg-white text-transparent"}
                        `}
                      >
                        <Check size={14} />
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-sm text-slate-500">Sin resultados.</div>
              )}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-slate-100 bg-white flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {selectedOptions.length} seleccionada(s)
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                  setQ("");
                }}
                className="text-xs font-bold text-slate-700 hover:text-slate-900"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {tip ? <p className="mt-1 text-[11px] text-slate-500">{tip}</p> : null}

      {error ? (
        <p className="mt-1 text-xs text-rose-600 font-medium animate-in slide-in-from-top-1">
          {error}
        </p>
      ) : null}
    </div>
  );
}
