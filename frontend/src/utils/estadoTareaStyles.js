// src/utils/estadoTareaStyles.js
export const ESTADO_TAREA_UI = {
  Pendiente:  { badge: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
  Asignada:   { badge: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500" },
  "En progreso": { badge: "bg-blue-50 text-blue-800 border-blue-200", dot: "bg-blue-500" },
  Completada: { badge: "bg-emerald-50 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" },
  Verificada: { badge: "bg-violet-50 text-violet-800 border-violet-200", dot: "bg-violet-500" },
  Cancelada:  { badge: "bg-rose-50 text-rose-800 border-rose-200", dot: "bg-rose-500" },
};

export const getEstadoTareaUI = (estado) => {
  return ESTADO_TAREA_UI[estado] || { badge: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" };
};
