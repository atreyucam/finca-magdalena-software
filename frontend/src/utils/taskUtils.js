// src/utils/taskUtils.js

// Diccionario de colores para estados
export const getTaskStatusColor = (status) => {
  const map = {
    "Pendiente": "yellow",
    "Asignada": "blue",
    "En progreso": "blue", // O indigo si prefieres diferenciar
    "Completada": "green",
    "Verificada": "purple",
    "Cancelada": "red",
  };
  return map[status] || "gray";
};

// Formateadores seguros
export const fmtPct = (v) => 
  (v === null || v === undefined) ? "—" : `${Number(v).toFixed(1)} %`;

export const fmtKg = (v) => 
  (v === null || v === undefined) ? "—" : `${Number(v).toFixed(2)} kg`;

export const humanBool = (val) => (val ? "Sí" : "No");

export const obtenerFaltante = (real) => {
  if (real === null || real === undefined) return "—";
  const diff = 100 - Number(real);
  return diff < 0 ? "0 %" : `${diff.toFixed(1)} %`;
};