import React from "react";
import { Inbox } from "lucide-react";

// 1. Contenedor Principal
export function Tabla({ children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          {children}
        </table>
      </div>
    </div>
  );
}

// 2. Cabecera (Thead)
export function TablaCabecera({ children }) {
  return (
    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
      <tr>{children}</tr>
    </thead>
  );
}

// 3. Celda de Cabecera (Th)
export function TablaHead({ children, className = "", align = "left" }) {
  const aligns = { left: "text-left", center: "text-center", right: "text-right" };
  return (
    <th className={`px-6 py-3 ${aligns[align]} ${className}`}>
      {children}
    </th>
  );
}

// 4. Cuerpo (Tbody)
export function TablaCuerpo({ children }) {
  return <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>;
}

// 5. Fila (Tr)
export function TablaFila({ children, className = "", onClick }) {
  return (
    <tr
      onClick={onClick}
      className={`transition-colors hover:bg-slate-50/80 ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </tr>
  );
}

// 6. Celda de Datos (Td)
export function TablaCelda({ children, className = "", align = "left", nowrap = true }) {
  const aligns = { left: "text-left", center: "text-center", right: "text-right" };
  return (
    <td className={`px-6 py-4 ${nowrap ? "whitespace-nowrap" : "whitespace-normal"} ${aligns[align]} ${className}`}>
      {children}
    </td>
  );
}

// Tabla.jsx
export function TablaVacia({ mensaje = "No hay datos para mostrar", colSpan = 100 }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-16 text-center">
        <div className="flex flex-col items-center justify-center text-slate-400">
          <div className="mb-3 rounded-full bg-slate-50 p-4">
            <Inbox size={32} strokeWidth={1.5} />
          </div>
          <p className="font-medium">{mensaje}</p>
        </div>
      </td>
    </tr>
  );
}
