import React from "react";

const ESTILOS = {
  verde: "bg-emerald-50 border-emerald-200 text-emerald-900 icon-emerald-600",
  azul: "bg-sky-50 border-sky-200 text-sky-900 icon-sky-600",
  rojo: "bg-rose-50 border-rose-200 text-rose-900 icon-rose-600",
  ambar: "bg-amber-50 border-amber-200 text-amber-900 icon-amber-600",
  violeta: "bg-violet-50 border-violet-200 text-violet-900 icon-violet-600",
  gris: "bg-white border-slate-200 text-slate-800 icon-slate-500",
};

export default function TarjetaDato({ 
  titulo, 
  valor, 
  subtitulo, 
  icono: Icono, 
  color = "gris",
  onClick 
}) {
  const tema = ESTILOS[color] || ESTILOS.gris;
  
  // Extraemos el color del icono del string de clases (un truco rápido)
  const colorIcono = tema.split(" ").find(c => c.startsWith("icon-"))?.replace("icon-", "text-") || "text-slate-500";

  return (
    <div 
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl border p-5 transition-all shadow-sm
        ${tema.replace(/icon-\w+-\d+/, "")} 
        ${onClick ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : ""}
      `}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">{titulo}</p>
          <h4 className="text-3xl font-extrabold tracking-tight">{valor}</h4>
          {subtitulo && <p className="mt-1 text-xs font-medium opacity-80">{subtitulo}</p>}
        </div>
        
        {Icono && (
          <div className={`p-2.5 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm ${colorIcono}`}>
            <Icono size={24} strokeWidth={2} />
          </div>
        )}
      </div>
    </div>
  );
}