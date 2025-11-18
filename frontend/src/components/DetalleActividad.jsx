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
              Este valor se comparará luego con el porcentaje real al completar
              la tarea.
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
              <option value="Mecanico">Mecánico</option>
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
              <option value="Directo_Suelo">Directo al suelo</option>
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
          </div>
        </div>
      )}

      {/* --- FITOSANITARIO --- */}
      {tipo === "fitosanitario" && (
        <div className={blockClass}>
          <div>
            <label className={labelBase}>Plaga o enfermedad</label>
            <input
              type="text"
              className={`${inputBase} mt-1`}
              value={detalle.plaga_enfermedad || ""}
              onChange={(e) => upd("plaga_enfermedad", e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">
              Ej.: Cochinilla, antracnosis, etc.
            </p>
          </div>

          <div>
            <label className={labelBase}>Umbral de acción (opcional)</label>
            <input
              type="text"
              className={`${inputBase} mt-1`}
              value={detalle.conteo_umbral || ""}
              onChange={(e) => upd("conteo_umbral", e.target.value)}
              placeholder='Ej. "Más de 5 plagas por cladodio"'
            />
            <p className="mt-1 text-xs text-slate-500">
              Describe el criterio a partir del cual se decide aplicar el
              tratamiento.
            </p>
          </div>

          <div>
            <label className={labelBase}>Periodo de carencia (días)</label>
            <input
              type="number"
              min="0"
              className={`${inputBase} mt-1`}
              value={
                detalle.periodo_carencia_dias === 0
                  ? 0
                  : detalle.periodo_carencia_dias || ""
              }
              onChange={(e) =>
                upd(
                  "periodo_carencia_dias",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              Días mínimos que deben pasar entre la aplicación y la cosecha.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelBase}>
                Volumen de aplicación (L totales, opcional)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                className={`${inputBase} mt-1`}
                value={
                  detalle.volumen_aplicacion_lt === 0
                    ? 0
                    : detalle.volumen_aplicacion_lt || ""
                }
                onChange={(e) =>
                  upd(
                    "volumen_aplicacion_lt",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
              />
            </div>

            <div>
              <label className={labelBase}>
                Equipo de aplicación (opcional)
              </label>
              <input
                type="text"
                className={`${inputBase} mt-1`}
                value={detalle.equipo_aplicacion || ""}
                onChange={(e) => upd("equipo_aplicacion", e.target.value)}
                placeholder="Ej. Bomba de espalda, motobomba, etc."
              />
            </div>
          </div>

          <div>
            <label className={labelBase}>
              % de plantas/área a tratar (planificado)
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
              Este valor se comparará luego con el porcentaje real al completar
              la tarea.
            </p>
          </div>
        </div>
      )}

      {/* --- ENFUNDADO --- */}
      {tipo === "enfundado" && (
        <div className={blockClass}>
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

      {/* --- COSECHA --- */}
      {tipo === "cosecha" && (
        <div className={blockClass}>
          <div>
            <label className={labelBase}>
              Kg planificados a cosechar en esta tarea
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              className={`${inputBase} mt-1`}
              value={
                detalle.kg_planificados === 0
                  ? 0
                  : detalle.kg_planificados || ""
              }
              onChange={(e) =>
                upd(
                  "kg_planificados",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              Este valor se comparará luego con los kilos realmente cosechados
              al verificar la tarea, para calcular el porcentaje de
              cumplimiento.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
