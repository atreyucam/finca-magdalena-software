import React from "react";
import { getTaskStatusColor } from "../../utils/taskUtils";

// Mapeo de estilos visuales basado en tu Chip actual
const STYLE_MAP = {
  blue: "bg-sky-50 text-sky-700 border-sky-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  yellow: "bg-amber-50 text-amber-700 border-amber-200",
  purple: "bg-violet-50 text-violet-700 border-violet-200",
  red: "bg-rose-50 text-rose-700 border-rose-200",
  gray: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function TaskBadge({ status }) {
  const colorKey = getTaskStatusColor(status);
  const classes = STYLE_MAP[colorKey] || STYLE_MAP.gray;

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${classes}`}>
      {status}
    </span>
  );
}