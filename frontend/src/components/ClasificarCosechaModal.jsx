import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Scale, AlertTriangle, AlertCircle, CheckCircle2, Trash2, Plus, Leaf
} from "lucide-react";
import { actualizarCosecha, obtenerTarea } from "../api/apiClient";
import VentanaModal from "./ui/VentanaModal";
import Boton from "./ui/Boton";

// Estilos locales para la tabla (similares a los nuevos Inputs)
const TABLE_INPUT =
  "w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-right";
const TABLE_SELECT =
  "w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all";

export default function CosechaClasificacionModal({
  open,
  onClose,
  onSaved,
  tareaId,
  cosecha
}) {
  const [localClasif, setLocalClasif] = useState([]);
  const [localRechazos, setLocalRechazos] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Total de báscula (real)
  const [kgBascula, setKgBascula] = useState(0);

  const DESTINOS = [
    { value: "Exportacion", label: "Exportación" },
    { value: "Nacional", label: "Nacional" },
    // { value: "Industrial", label: "Industrial" },
  ];

  const CAUSAS = [
    { value: "DanoMecanico", label: "Daño mecánico" },
    { value: "Plaga", label: "Plaga / enfermedad" },
    { value: "Calibre", label: "Calibre fuera de estándar" },
    { value: "Manipulacion", label: "Mala manipulación" },
    { value: "Otro", label: "Otro" },
  ];

  // ✅ Cuando se abre el modal: precargar lo guardado + cargar kg de báscula desde la tarea
useEffect(() => {
  if (!open || !tareaId) return;

  (async () => {
    try {
      const res = await obtenerTarea(tareaId);
      const t = res?.data || res;

      // 🔎 DEBUG: mira qué campos vienen realmente
console.log("🟦 [CosechaModal] tarea completa:", t);
console.log("🟩 [CosechaModal] detalles:", t?.detalles);
console.log("🟨 [CosechaModal] tareaCosecha:", t?.tareaCosecha);
console.log("🟥 [CosechaModal] cosecha prop:", cosecha);
      // ✅ Fuente principal: t.detalles (JSONB)
      const detalles = t?.detalles || {};
      const cosechaObj = t?.cosecha || {}; // ✅ viene por el “TRUCO” del DTO
      // ✅ 1) KG BÁSCULA: usa el campo real que ya se muestra en tu tarjeta "REAL (BÁSCULA)"
      // (ponemos muchos fallbacks porque tu backend puede tener otro nombre)
      const rawKg =
  // ✅ PRIORIDAD REAL: el mismo campo que estás guardando al completar
  cosechaObj?.kg_cosechados ??
  detalles?.kg_cosechados ??
  // fallbacks antiguos por si acaso
  detalles?.kg_real_bascula ??
  detalles?.kgBascula ??
  detalles?.kg_bascula ??
  detalles?.peso_real_kg ??
  0;
setKgBascula(Number(rawKg) || 0);


      // ✅ 2) Precargar clasificación y rechazos desde detalles (o desde cosecha si viene)
      const clasif =
  Array.isArray(cosechaObj?.clasificacion) ? cosechaObj.clasificacion :
  Array.isArray(detalles?.clasificacion) ? detalles.clasificacion :
  [];;

      const rech =
  Array.isArray(cosechaObj?.rechazos) ? cosechaObj.rechazos :
  Array.isArray(detalles?.rechazos) ? detalles.rechazos :
  [];
setLocalClasif(clasif.map(c => ({
  destino: c.destino ?? "",
  gabetas: c.gabetas ?? "",
  peso_promedio_gabeta_kg: c.peso_promedio_gabeta_kg ?? "",
  kg: c.kg ?? "",
})));

      setLocalRechazos(rech.map(r => ({
  causa: r.causa ?? "",
  kg: r.kg ?? "",
  observacion: r.observacion ?? "",
})));
    } catch (e) {
      // Fallback si falla el fetch: al menos carga lo que llegue en props
      setKgBascula(Number(cosecha?.kg_cosechados) || 0);

      const clasifInit = Array.isArray(cosecha?.clasificacion) ? cosecha.clasificacion : [];
      const rechazosInit = Array.isArray(cosecha?.rechazos) ? cosecha.rechazos : [];

      setLocalClasif(
        clasifInit.map((c) => ({
          destino: c.destino ?? "",
          gabetas: c.gabetas ?? "",
          peso_promedio_gabeta_kg: c.peso_promedio_gabeta_kg ?? "",
          kg: c.kg ?? "",
        }))
      );

      setLocalRechazos(
        rechazosInit.map((r) => ({
          causa: r.causa ?? "",
          kg: r.kg ?? "",
          observacion: r.observacion ?? "",
        }))
      );

      toast.error("No se pudo cargar la tarea para la clasificación");
    }
  })();
}, [open, tareaId]); // 👈 NO pongas `cosecha` aquí o se te resetea raro


  // ✅ EL TOTAL CORRECTO PARA BALANCE ES kgBascula (no cosecha?.kg_cosechados)
  const totalCosechado = Number(kgBascula) || 0;

  // Cálculos en tiempo real
  const sumClasificacion = localClasif.reduce((acc, row) => acc + (Number(row.kg) || 0), 0);
  const sumRechazos = localRechazos.reduce((acc, row) => acc + (Number(row.kg) || 0), 0);
  const totalProcesado = sumClasificacion + sumRechazos;

  const restante = totalCosechado - totalProcesado;

  // Tolerancia para decimales (0.05 kg)
  const isBalanced = totalCosechado > 0 && Math.abs(restante) < 0.05;


  const updateClasifRow = (index, field, value) => {
    setLocalClasif((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const updatedRow = { ...row, [field]: value };

        // Autocalcular KG si cambian gabetas o peso promedio
        if (field === "gabetas" || field === "peso_promedio_gabeta_kg") {
          const g = Number(field === "gabetas" ? value : row.gabetas) || 0;
          const p =
            Number(field === "peso_promedio_gabeta_kg" ? value : row.peso_promedio_gabeta_kg) || 0;

          if (g > 0 && p > 0) updatedRow.kg = (g * p).toFixed(2);
        }
        return updatedRow;
      })
    );
  };

  const updateRechazoRow = (index, field, value) => {
    setLocalRechazos((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const handleSave = async () => {
    if (!totalCosechado || totalCosechado <= 0) {
      return toast.error("No hay kg de báscula para clasificar (0.00 kg).");
    }

    if (!isBalanced) {
      if (restante > 0.05) return toast.error(`Faltan clasificar ${restante.toFixed(2)} kg.`);
      if (restante < -0.05)
        return toast.error(`Te has excedido por ${Math.abs(restante).toFixed(2)} kg.`);
    }

    setLoading(true);
    try {
      const payload = {
        clasificacion: localClasif.map((c) => ({
          ...c,
          gabetas: Number(c.gabetas) || 0,
          peso_promedio_gabeta_kg: Number(c.peso_promedio_gabeta_kg) || 0,
          kg: Number(c.kg) || 0,
        })),
        rechazos: localRechazos.map((r) => ({
          ...r,
          kg: Number(r.kg) || 0,
        })),
      };

      console.log("⚖️ [FRONTEND] Payload Clasificación:", payload);
      await actualizarCosecha(tareaId, payload);

      toast.success("Clasificación guardada");
      onClose();
      await onSaved?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const addClasifRow = () =>
    setLocalClasif((prev) => [
      ...prev,
      { destino: "", gabetas: "", peso_promedio_gabeta_kg: "", kg: "" },
    ]);
  const removeClasifRow = (index) => setLocalClasif((prev) => prev.filter((_, i) => i !== index));

  const addRechazoRow = () =>
    setLocalRechazos((prev) => [...prev, { causa: "", kg: "", observacion: "" }]);
  const removeRechazoRow = (index) => setLocalRechazos((prev) => prev.filter((_, i) => i !== index));

  const footer = (
    <>
      <Boton variante="fantasma" onClick={onClose} disabled={loading}>
        Cancelar
      </Boton>
      <Boton
        onClick={handleSave}
        cargando={loading}
        disabled={loading}
        variante={!isBalanced ? "secundario" : "primario"}
      >
        Guardar Clasificación
      </Boton>
    </>
  );

  return (
    <VentanaModal
      abierto={open}
      cerrar={onClose}
      titulo={
        <div className="flex items-center gap-2">
          <Scale className="text-emerald-600" size={24} />
          <div>
            <h3 className="text-lg font-bold text-slate-800">Clasificación de Cosecha</h3>
            <p className="text-xs text-slate-500 font-normal">
              Distribución de kilos por destino y rechazo
            </p>
          </div>
        </div>
      }
      footer={footer}
      ancho="max-w-5xl"
    >
      <div className="space-y-6">
        {/* Banner de Balance de Masas */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div>
            <div className="text-xs uppercase text-slate-500 font-bold tracking-wider mb-1">
              Total Cosechado (Báscula)
            </div>
            <div className="text-4xl font-extrabold text-slate-800 tracking-tight">
              {totalCosechado.toFixed(2)}{" "}
              <span className="text-xl text-slate-400 font-medium">kg</span>
            </div>
          </div>

          <div className="hidden md:block h-12 w-px bg-slate-300"></div>

          <div className="text-center md:text-right">
            <div className="flex items-center justify-center md:justify-end gap-2 mb-1">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                {isBalanced ? "Estado" : "Diferencia"}
              </span>
            </div>

            {isBalanced ? (
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                <CheckCircle2 size={24} />
                <span className="text-lg font-bold">Balanceado</span>
              </div>
            ) : (
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
                  restante < 0
                    ? "bg-rose-50 text-rose-700 border-rose-100"
                    : "bg-amber-50 text-amber-700 border-amber-100"
                }`}
              >
                {restante < 0 ? <AlertCircle size={24} /> : <Scale size={24} />}
                <div className="text-right">
                  <div className="text-lg font-bold">{Math.abs(restante).toFixed(2)} kg</div>
                  <div className="text-[10px] uppercase font-bold opacity-80">
                    {restante < 0 ? "Excedente" : "Por Clasificar"}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECCIÓN 1: Clasificación Comercial */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700">
                <Leaf size={16} />
              </div>
              Destinos Comerciales
            </h4>
            <Boton onClick={addClasifRow} variante="secundario" className="!px-3 !py-1.5 !text-xs">
              <Plus size={14} className="mr-1" /> Agregar Destino
            </Boton>
          </div>

          {localClasif.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
              <p className="text-slate-400 text-sm">No se han agregado destinos comerciales.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left rounded-l-lg">Destino</th>
                    <th className="px-4 py-3 text-right w-32">Gabetas</th>
                    <th className="px-4 py-3 text-right w-40">Kg Promedio</th>
                    <th className="px-4 py-3 text-right w-40">Total Kg</th>
                    <th className="px-2 py-3 w-10 rounded-r-lg"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {localClasif.map((row, index) => (
                    <tr key={index}>
                      <td className="p-3">
                        <select
                          value={row.destino ?? ""}
                          onChange={(e) => updateClasifRow(index, "destino", e.target.value)}
                          className={TABLE_SELECT}
                        >
                          <option value="">-- Seleccionar --</option>
                          {DESTINOS.map((opt) => (
                            <option
                              key={opt.value}
                              value={opt.value}
                              disabled={localClasif.some((c) => c.destino === opt.value && c !== row)}
                            >
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={row.gabetas ?? ""}
                          onChange={(e) => updateClasifRow(index, "gabetas", e.target.value)}
                          className={TABLE_INPUT}
                          placeholder="0"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={row.peso_promedio_gabeta_kg ?? ""}
                          onChange={(e) =>
                            updateClasifRow(index, "peso_promedio_gabeta_kg", e.target.value)
                          }
                          className={TABLE_INPUT}
                          placeholder="0.00"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={row.kg ?? ""}
                          onChange={(e) => updateClasifRow(index, "kg", e.target.value)}
                          className={`${TABLE_INPUT} bg-emerald-50 text-emerald-800 font-bold border-emerald-200`}
                          placeholder="0.00"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => removeClasifRow(index)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* SECCIÓN 2: Rechazos */}
        <section className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-sm font-bold text-rose-700 flex items-center gap-2">
              <div className="p-1.5 bg-rose-100 rounded-lg text-rose-700">
                <AlertTriangle size={16} />
              </div>
              Fruta Rechazada / Merma
            </h4>
            <Boton
              onClick={addRechazoRow}
              className="!bg-rose-50 !text-rose-700 !border-rose-200 hover:!bg-rose-100 !px-3 !py-1.5 !text-xs"
            >
              <Plus size={14} className="mr-1" /> Agregar Rechazo
            </Boton>
          </div>

          {localRechazos.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-rose-50 rounded-xl bg-rose-50/30">
              <p className="text-rose-400 text-sm">No hay rechazos registrados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-rose-50 text-rose-800 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left rounded-l-lg">Causa</th>
                    <th className="px-4 py-3 text-left">Observación</th>
                    <th className="px-4 py-3 text-right w-40">Total Kg</th>
                    <th className="px-2 py-3 w-10 rounded-r-lg"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100">
                  {localRechazos.map((row, index) => (
                    <tr key={index}>
                      <td className="p-3">
                        <select
                          value={row.causa ?? ""}
                          onChange={(e) => updateRechazoRow(index, "causa", e.target.value)}
                          className={`${TABLE_SELECT} border-rose-200 focus:ring-rose-500 focus:border-rose-500`}
                        >
                          <option value="">-- Seleccionar --</option>
                          {CAUSAS.map((opt) => (
                            <option
                              key={opt.value}
                              value={opt.value}
                              disabled={localRechazos.some((r) => r.causa === opt.value && r !== row)}
                            >
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={row.observacion ?? ""}
                          onChange={(e) => updateRechazoRow(index, "observacion", e.target.value)}
                          className={`${TABLE_INPUT} text-left border-rose-200 focus:ring-rose-500 focus:border-rose-500`}
                          placeholder="Detalle opcional..."
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={row.kg ?? ""}
                          onChange={(e) => updateRechazoRow(index, "kg", e.target.value)}
                          className={`${TABLE_INPUT} bg-rose-50 text-rose-800 font-bold border-rose-200 focus:ring-rose-500 focus:border-rose-500`}
                          placeholder="0.00"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => removeRechazoRow(index)}
                          className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </VentanaModal>
  );
}
