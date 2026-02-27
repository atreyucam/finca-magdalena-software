import Input from "./ui/Input";
import Select from "./ui/Select";

export default function FormularioDetalleActividad({ tipo, detalle, setDetalle }) {
  const upd = (field, value) => setDetalle((d) => ({ ...d, [field]: value }));
  const blockClass = "rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-4";

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      
      {/* PODA */}
      {tipo === "poda" && (
        <div className={blockClass}>
          <Select label="Tipo de poda" value={detalle.tipo || ""} onChange={(e) => upd("tipo", e.target.value)}>
              <option value="">Seleccione...</option>
              <option value="Formacion">Poda de formación</option>
              <option value="Sanitaria">Poda sanitaria</option>
              <option value="Produccion">Poda de producción</option>
          </Select>
          <Input 
             label="Número de plantas a intervenir (Planificado)" 
             type="number" min="1" step="1" 
             value={detalle.numero_plantas_intervenir ?? ""} 
             onChange={(e) => upd("numero_plantas_intervenir", e.target.value)}
          />
          <Input label="Disposición de restos (BPA)" required placeholder="Ej. Se composta, se incorpora..." value={detalle.disposicion_restos ?? ""} onChange={(e) => upd("disposicion_restos", e.target.value)} />
        </div>
      )}

      {/* MALEZA */}
      {tipo === "maleza" && (
        <div className={blockClass}>
          <Select label="Método de control" value={detalle.metodo || ""} onChange={(e) => upd("metodo", e.target.value)}>
              <option value="">Seleccione...</option>
              <option value="manual">Manual</option>
              <option value="quimico">Químico</option>
          </Select>
          <Input label="Cobertura a intervenir (%)" type="number" min="0" max="100" value={detalle.cobertura_planificada_pct ?? ""} onChange={(e) => upd("cobertura_planificada_pct", e.target.value)} />
        </div>
      )}

      {/* NUTRICIÓN */}
      {tipo === "nutricion" && (
        <div className={blockClass}>
          <Select label="Método de aplicación" value={detalle.metodo_aplicacion || ""} onChange={(e) => upd("metodo_aplicacion", e.target.value)}>
              <option value="">Seleccione...</option>
              <option value="Drench">Drench</option>
              <option value="Foliar">Foliar</option>
              <option value="Directo_Suelo">Granulado directo</option>
              <option value="Fertirriego">Fertirriego</option>
          </Select>
          <Input label="% de plantas a tratar" type="number" min="0" max="100" value={detalle.porcentaje_plantas_plan_pct ?? ""} onChange={(e) => upd("porcentaje_plantas_plan_pct", e.target.value)} />
        </div>
      )}

      {/* FITOSANITARIO */}
 {/* FITOSANITARIO */}
      {tipo === "fitosanitario" && (
        <div className={blockClass}>
           <div className="grid grid-cols-2 gap-4">
              <Input label="Plaga Objetivo" value={detalle.plaga_enfermedad || ""} onChange={(e) => upd("plaga_enfermedad", e.target.value)} />
              <Input label="Periodo Carencia (Días)" type="number" min="0" value={detalle.periodo_carencia_dias ?? ""} onChange={(e) => upd("periodo_carencia_dias", e.target.value)} />
           </div>
           {/* SOLO VOLUMEN (Equipo se llena solo) */}
           <div className="grid grid-cols-1 gap-4">
              <Input label="Volumen Mezcla (L)" type="number" min="0" value={detalle.volumen_aplicacion_lt ?? ""} onChange={(e) => upd("volumen_aplicacion_lt", e.target.value)} />
           </div>
           <Input label="Umbral de Acción" value={detalle.conteo_umbral || ""} onChange={(e) => upd("conteo_umbral", e.target.value)} placeholder="Opcional" />
        </div>
      )}

      {/* ENFUNDADO */}
      {tipo === "enfundado" && (
        <div className={blockClass}>
           <Input label="Número de fundas a colocar (Planificado)" type="number" min="1" step="1" value={detalle.numero_fundas_colocadas ?? ""} onChange={(e) => upd("numero_fundas_colocadas", e.target.value)} />
        </div>
      )}

      {/* COSECHA */}
      {tipo === "cosecha" && (
        <div className={blockClass}>
           <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl mb-2 flex items-center gap-2">
              <span className="text-xl">🍈</span>
              <p className="text-xs text-emerald-900">Planificación de producción estimada.</p>
           </div>
           <Input label="Kg Estimados" type="number" min="0" value={detalle.kg_planificados ?? ""} onChange={(e) => upd("kg_planificados", e.target.value)} />
           <Input
             label="Grado de maduración esperado (1 a 8)"
             type="number"
             min="1"
             max="8"
             step="1"
             value={detalle.grado_maduracion ?? ""}
             onChange={(e) => upd("grado_maduracion", e.target.value)}
           />
        </div>
      )}
    </div>
  );
}
