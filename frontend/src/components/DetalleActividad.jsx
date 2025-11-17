// src/components/DetalleActividad.jsx
export default function DetalleActividad({ tipo, detalle, setDetalle }) {
  const inputBase =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";

  const labelBase = "block text-sm font-medium text-slate-700";
  
  const blockClass =
    "rounded-xl border border-slate-200 p-4 bg-slate-50 space-y-4 shadow-inner";

  // helper para actualizar estado
  const upd = (field, value) => {
    setDetalle((d) => ({ ...d, [field]: value }));
  };

  return (
    <div className="mt-6">
      <h3 className="text-base font-semibold text-slate-900 mb-2">
        Detalles de actividad
      </h3>

      {/* --- PODA --- */}
      {tipo === "poda" && (
        <div className={blockClass}>
          <div>
            <label className={labelBase}>Tipo de poda</label>
            <select
              className={`${inputBase} mt-1`}
              value={detalle.tipo || ""}
              onChange={(e) => upd("tipo", e.target.value)}
            >
              <option value="">Seleccione</option>
              <option value="Formacion">Poda de formación</option>
              <option value="Sanitaria">Poda sanitaria</option>
              <option value="Produccion">Poda de producción</option>
            </select>
          </div>

          {/* <div>
            <label className={labelBase}>
              Plantas intervenidas estimadas (unidades)
            </label>
            <input
              type="number"
              className={`${inputBase} mt-1`}
              min="0"
              value={
                detalle.plantas_intervenidas === 0
                  ? 0
                  : detalle.plantas_intervenidas || ""
              }
              onChange={(e) =>
                upd("plantas_intervenidas", Number(e.target.value) || 0)
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              Valor opcional como referencia aproximada.
            </p>
          </div> */}

          <div>
            <label className={labelBase}>
              Porcentaje de plantas a intervenir planificado (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              className={`${inputBase} mt-1`}
              value={
                detalle.porcentaje_plantas_plan_pct === 0
                  ? 0
                  : detalle.porcentaje_plantas_plan_pct || ""
              }
              onChange={(e) =>
                upd(
                  "porcentaje_plantas_plan_pct",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              Este valor se comparará luego con el porcentaje real al completar la tarea.
            </p>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              checked={detalle.herramientas_desinfectadas ?? false}
              onChange={(e) =>
                upd("herramientas_desinfectadas", e.target.checked)
              }
            />
            <label className="text-sm text-slate-700">
              Herramientas desinfectadas
            </label>
          </div>
        </div>
      )}

      {/* --- MALEZA --- */}
      {tipo === "maleza" && (
        <div className={blockClass}>
          <div>
            <label className={labelBase}>Método</label>
            <select
              className={`${inputBase} mt-1`}
              value={detalle.metodo || ""}
              onChange={(e) => upd("metodo", e.target.value)}
            >
              <option value="">Seleccione método</option>
              <option value="Manual">Manual</option>
              <option value="Quimico">Químico</option>
            </select>
          </div>

          <div>
            <label className={labelBase}>
              Cobertura planificada a intervenir (%) — 0 a 100
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              className={`${inputBase} mt-1`}
              value={
                detalle.cobertura_planificada_pct === 0
                  ? 0
                  : detalle.cobertura_planificada_pct || ""
              }
              onChange={(e) =>
                upd(
                  "cobertura_planificada_pct",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              Este porcentaje representa el área que se espera intervenir.
            </p>
          </div>
        </div>
      )}

      {/* --- NUTRICIÓN --- */}
      {tipo === "nutricion" && (
  <div className={blockClass}>
    <div>
      <label className={labelBase}>Método de aplicación</label>
      <select
        className={`${inputBase} mt-1`}
        value={detalle.metodo_aplicacion || ""}
        onChange={(e) => upd("metodo_aplicacion", e.target.value)}
      >
        <option value="">Seleccione</option>
        <option value="Drench">Drench</option>
        <option value="Foliar">Foliar</option>
        <option value="Fertirriego">Fertirriego</option>
      </select>
    </div>

    <div>
      <label className={labelBase}>
        % de plantas a tratar (planificado)
      </label>
      <input
        type="number"
        min="0"
        max="100"
        className={`${inputBase} mt-1`}
        value={detalle.porcentaje_plantas_plan_pct || ""}
        onChange={(e) =>
          upd("porcentaje_plantas_plan_pct", Number(e.target.value))
        }
      />
    </div>
  </div>
)}


      {/* --- FITOSANITARIO --- */}
      {tipo === "fitosanitario" && (
  <div className={blockClass}>
    {/* lo que ya tienes */}
    <div>
      <label className={labelBase}>Plaga o enfermedad</label>
      <input
        type="text"
        className={`${inputBase} mt-1`}
        value={detalle.plaga_enfermedad || ""}
        onChange={(e) => upd("plaga_enfermedad", e.target.value)}
      />
    </div>

    {/* ...conteo_umbral, periodo_carencia_dias... */}

    <div>
      <label className={labelBase}>
        % de plantas/área a tratar (planificado)
      </label>
      <input
        type="number"
        min="0"
        max="100"
        className={`${inputBase} mt-1`}
        value={detalle.porcentaje_plantas_plan_pct || ""}
        onChange={(e) =>
          upd("porcentaje_plantas_plan_pct", Number(e.target.value))
        }
      />
    </div>
  </div>
)}


      {/* --- ENFUNDADO --- */}
      {tipo === "enfundado" && (
        <div className={blockClass}>
          <div>
            <label className={labelBase}>Frutos enfundados estimados (unidades)</label>
            <input
              type="number"
              min="0"
              className={`${inputBase} mt-1`}
              value={
                detalle.frutos_enfundados === 0
                  ? 0
                  : detalle.frutos_enfundados || ""
              }
              onChange={(e) =>
                upd("frutos_enfundados", Number(e.target.value) || 0)
              }
            />
          </div>

          <div>
            <label className={labelBase}>
              Porcentaje de frutos a enfundar planificado (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              className={`${inputBase} mt-1`}
              value={
                detalle.porcentaje_frutos_plan_pct === 0
                  ? 0
                  : detalle.porcentaje_frutos_plan_pct || ""
              }
              onChange={(e) =>
                upd(
                  "porcentaje_frutos_plan_pct",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              Luego se comparará con el porcentaje real de frutos enfundados.
            </p>
          </div>
        </div>
      )}

      {/* --- COSECHA (sin formulario) --- */}
      {tipo === "cosecha" && (
        <div className={blockClass}>
          <p className="text-sm text-slate-700">
            *La cosecha no requiere detalles adicionales en esta etapa.*
          </p>
        </div>
      )}
    </div>
  );
}
