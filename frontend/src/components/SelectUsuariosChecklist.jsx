import { useMemo } from "react";

export default function SelectUsuariosChecklist({
  usuarios = [],
  value = [],
  onChange,
  label = "Asignar Trabajadores",
}) {
  const selectedSet = useMemo(() => new Set(value.map(String)), [value]);

  const toggle = (id) => {
    const sid = String(id);
    const next = new Set(selectedSet);
    if (next.has(sid)) next.delete(sid);
    else next.add(sid);
    onChange(Array.from(next));
  };

  const selectedObjects = useMemo(() => {
    const map = new Map(usuarios.map(u => [String(u.id), u]));
    return value.map(v => map.get(String(v))).filter(Boolean);
  }, [value, usuarios]);

  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">{label}</label>

      {/* Chips de seleccionados */}
      {selectedObjects.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedObjects.slice(0, 8).map((u) => (
            <span 
              key={u.id} 
              className={`px-2 py-1 rounded-lg text-[11px] border flex items-center gap-1 ${
                u.tipo === 'Esporadico' ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200"
              }`}
            >
              <span className="font-bold">{u.nombres.split(' ')[0]} {u.apellidos.charAt(0)}.</span>
              <span className={`w-1.5 h-1.5 rounded-full ${u.tipo === 'Esporadico' ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
            </span>
          ))}
          {selectedObjects.length > 8 && (
            <span className="px-2 py-1 rounded-lg text-[11px] bg-slate-50 text-slate-500 border border-slate-200">
              +{selectedObjects.length - 8} más
            </span>
          )}
        </div>
      )}

      {/* Contenedor de lista con scroll */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
           <span>Selecciona personal</span>
           <span>{selectedSet.size} seleccionados</span>
        </div>

        <div className="max-h-52 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {usuarios.map(u => {
            const checked = selectedSet.has(String(u.id));
            const esEsporadico = u.tipo === 'Esporadico';

            return (
              <label
                key={u.id}
                className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition select-none
                  ${checked 
                    ? (esEsporadico ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200") 
                    : "bg-white border-slate-100 hover:bg-slate-50"}
                `}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(u.id)}
                  className={`h-4 w-4 rounded border-gray-300 focus:ring-offset-0 ${
                      esEsporadico ? "text-amber-500 focus:ring-amber-500" : "text-blue-600 focus:ring-blue-600"
                  }`}
                />
                
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                      <div className={`text-xs font-semibold ${checked ? "text-slate-900" : "text-slate-600"}`}>
                        {u.nombres} {u.apellidos}
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ml-2 ${
                          esEsporadico ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                      }`}>
                          {u.tipo || 'Fijo'}
                      </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>{u.role === 'Tecnico' ? 'Técnico' : 'Trabajador'}</span>
                    {u.email && <span>• {u.email}</span>}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}