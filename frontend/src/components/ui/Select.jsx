import React, { forwardRef } from "react";
import { ChevronDown } from "lucide-react";

const Select = forwardRef(
  (
    { label, error, children, className = "", contenedorClass = "", ...props },
    ref
  ) => {
    return (
      <div className={`w-full ${contenedorClass}`}>
        {label && (
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            {label} {props.required && <span className="text-rose-500">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            className={`
              w-full rounded-xl border bg-white py-2.5 pl-3 pr-10 text-sm text-slate-900
              focus:outline-none focus:ring-2 transition-all appearance-none
              disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed
              ${error
                ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200"
                : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-100"
              }
              ${className}
            `}
            {...props}
          >
            {children}
          </select>

          {/* Flecha */}
          <ChevronDown
            size={18}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
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

Select.displayName = "Select";
export default Select;
