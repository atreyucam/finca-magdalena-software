import React, { forwardRef } from "react";

const Input = forwardRef(
  (
    {
      label,
      error,
      icono: Icono,
      className = "",
      contenedorClass = "",
      ...props
    },
    ref
  ) => {
    // ✅ Evita uncontrolled -> controlled:
    // Si alguien pasa value={undefined/null}, lo convertimos a ""
    const normalizedProps = { ...props };
    if ("value" in normalizedProps && normalizedProps.value == null) {
      normalizedProps.value = "";
    }

    return (
      <div className={`w-full ${contenedorClass}`}>
        {label && (
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            {label} {props.required && <span className="text-rose-500">*</span>}
          </label>
        )}

        <div className="relative">
          {Icono && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Icono size={18} />
            </div>
          )}

          <input
            ref={ref}
            className={`
              w-full rounded-xl border bg-white py-2.5 text-sm text-slate-900
              placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all
              disabled:bg-slate-100 disabled:text-slate-500
              ${Icono ? "pl-10 pr-3" : "px-3"}
              ${
                error
                  ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200"
                  : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-100"
              }
              ${className}
            `}
            {...normalizedProps}
          />
        </div>

        {error && (
          <p className="mt-1 text-xs text-rose-600 font-medium animate-in slide-in-from-top-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
