const CONFIG_COLORES = {
  // Estados Generales
  activo: "bg-emerald-100 text-emerald-800 border-emerald-200",
  inactivo: "bg-slate-100 text-slate-600 border-slate-200",
  borrador: "bg-amber-50 text-amber-700 border-amber-200",

    // ✅ INVENTARIO: Tipos de movimiento
  entrada: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "ajuste entrada": "bg-violet-50 text-violet-700 ring-violet-600/20", // lila como verificado
  salida: "bg-rose-50 text-rose-700 ring-rose-600/20",

  
  // Tareas
  pendiente: "bg-amber-50 text-amber-700 ring-amber-600/20",
  asignada: "bg-sky-50 text-sky-700 ring-sky-600/20",
  "en progreso": "bg-blue-50 text-blue-700 ring-blue-600/20 animate-pulse",
  completada: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  verificada: "bg-violet-50 text-violet-700 ring-violet-600/20",
  cancelada: "bg-rose-50 text-rose-700 ring-rose-600/20",
  
  // Roles
  propietario: "bg-purple-100 text-purple-800",
  tecnico: "bg-indigo-100 text-indigo-800",
  trabajador: "bg-slate-100 text-slate-800",
  
  // Default
  default: "bg-gray-100 text-gray-800 border-gray-200",
};

export default function Badge({ 
  children, 
  variante, // Si no se pasa variante, intenta usar children como clave
  className = "" 
}) {
  const clave = (variante || children || "default").toString().toLowerCase();
  const clasesColor = CONFIG_COLORES[clave] || CONFIG_COLORES.default;

  return (
    <span className={`
      inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border border-transparent
      ${clasesColor} 
      ${className}
    `}>
      {children}
    </span>
  );
}