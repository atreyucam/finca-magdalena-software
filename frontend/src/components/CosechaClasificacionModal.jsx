// src/components/CosechaClasificacionModal.jsx
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { actualizarCosecha } from "../api/apiClient"; // ej: PATCH /tareas/:id/cosecha

const textareaBase = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";
const btnPrimary = "inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-700";
const btnGhost = "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";

export default function CosechaClasificacionModal({
  open,
  onClose,
  onSaved,
  tareaId,
  cosecha, // tarea.tareaCosecha
}) {
  const [localClasif, setLocalClasif] = useState([]);
  const [localRechazos, setLocalRechazos] = useState([]);
  const [gradoMadurez, setGradoMadurez] = useState("");
  const [notas, setNotas] = useState("");

  const DESTINOS = [
  { value: "Exportacion", label: "Exportación" },
  { value: "Nacional", label: "Nacional" },
];

const CAUSAS = [
  { value: "DanoMecanico", label: "Daño mecánico" },
  { value: "Plaga", label: "Plaga / enfermedad" },
  { value: "Calibre", label: "Calibre fuera de estándar" },
  { value: "Manipulacion", label: "Mala manipulación" },
  { value: "Otro", label: "Otro" },
];


  useEffect(() => {
    if (open && cosecha) {
      setLocalClasif(cosecha.clasificacion || []);
      setLocalRechazos(cosecha.rechazos || []);
      setGradoMadurez(
      cosecha.grado_madurez != null ? String(cosecha.grado_madurez) : ""
    );
      setNotas(cosecha.notas || "");
    }
    if (!open) {
      setLocalClasif([]);
      setLocalRechazos([]);
      setGradoMadurez("");
      setNotas("");
    }
  }, [open, cosecha?.id]);

  if (!open) return null;

  const handleSave = async () => {
    try {
      // aquí mandas al backend el payload completo
      await actualizarCosecha(tareaId, {
        grado_madurez: gradoMadurez || null,
        notas: notas || null,
        clasificacion: localClasif,
        rechazos: localRechazos,
      });

      toast.success("Clasificación de cosecha guardada ✅");
      onClose?.();
      await onSaved?.();
    } catch (e) {
      console.error(e);
      toast.error(
        e?.response?.data?.message || "No se pudo guardar la clasificación"
      );
    }
  };

    const updateClasifRow = (index, field, value) => {
    setLocalClasif((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  const addClasifRow = () => {
    setLocalClasif((prev) => [
      ...prev,
      {
        destino: "",
        gabetas: "",
        peso_promedio_gabeta_kg: "",
        kg: "",
      },
    ]);
  };

  const removeClasifRow = (index) => {
    setLocalClasif((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRechazoRow = (index, field, value) => {
    setLocalRechazos((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  const addRechazoRow = () => {
    setLocalRechazos((prev) => [
      ...prev,
      {
        causa: "",
        kg: "",
        observacion: "",
      },
    ]);
  };

  const removeRechazoRow = (index) => {
    setLocalRechazos((prev) => prev.filter((_, i) => i !== index));
  };


  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-[1px] p-0 sm:p-4 flex sm:items-center sm:justify-center">
      <div className="w-full max-w-none sm:max-w-3xl h-[100dvh] sm:h-auto sm:max-h-[calc(100dvh-2rem)] rounded-none sm:rounded-2xl sm:border border-slate-200 bg-white shadow-[0_24px_60px_rgba(0,0,0,.18)] grid grid-rows-[auto,1fr,auto] overflow-hidden">
        {/* header */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            Clasificación y rechazos de cosecha
          </h3>
          <button onClick={onClose} className={btnGhost}>Cerrar</button>
        </div>

                {/* body */}
        <div className="min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-6">
          {/* Grado de madurez */}
          <section className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Grado de madurez (0–10)
            </label>
            <input
              type="number"
              min={0}
              max={10}
              step="0.1"
              value={gradoMadurez}
              onChange={(e) => setGradoMadurez(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Ej: 8.5"
            />
            <p className="text-xs text-slate-500">
              Puedes usar una escala subjetiva de 0 (muy verde) a 10 (muy madura).
            </p>
          </section>

          {/* Notas / observaciones */}
          <section className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Notas / observaciones generales de la cosecha
            </label>
            <textarea
              rows={3}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej.: Fruta con buen color y calibre, ligera presencia de daños mecánicos en algunas gabetas…"
              className={textareaBase}
            />
          </section>

          {/* Clasificación por destino */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-800">
                Clasificación por destino
              </h4>
              <button
                type="button"
                onClick={addClasifRow}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
              >
                + Agregar fila
              </button>
            </div>

            {localClasif.length === 0 && (
              <p className="text-xs text-slate-500">
                No hay clasificaciones registradas. Agrega filas para cada destino
                (exportación, mercado local, etc.).
              </p>
            )}

            {localClasif.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-xs md:text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-2 text-left font-medium">Destino</th>
                      <th className="p-2 text-right font-medium">Gabetas</th>
                      <th className="p-2 text-right font-medium">
                        Peso prom. gabeta (kg)
                      </th>
                      <th className="p-2 text-right font-medium">Kg</th>
                      <th className="p-2 text-right font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {localClasif.map((row, index) => (
                      <tr key={index}>
                        <td className="p-2">
                          <select
  value={row.destino ?? ""}
  onChange={(e) => updateClasifRow(index, "destino", e.target.value)}
  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs md:text-sm"
>
  <option value="">Selecciona destino…</option>
  {DESTINOS.map((opt) => (
    <option key={opt.value} value={opt.value}>
      {opt.label}
    </option>
  ))}
</select>

                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            step="1"
                            value={row.gabetas ?? ""}
                            onChange={(e) =>
                              updateClasifRow(index, "gabetas", e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs md:text-sm text-right"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={row.peso_promedio_gabeta_kg ?? ""}
                            onChange={(e) =>
                              updateClasifRow(
                                index,
                                "peso_promedio_gabeta_kg",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs md:text-sm text-right"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={row.kg ?? ""}
                            onChange={(e) =>
                              updateClasifRow(index, "kg", e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs md:text-sm text-right"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeClasifRow(index)}
                            className="text-xs text-rose-600 hover:text-rose-700"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Rechazos */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-800">
                Rechazos de fruta
              </h4>
              <button
                type="button"
                onClick={addRechazoRow}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
              >
                + Agregar fila
              </button>
            </div>

            {localRechazos.length === 0 && (
              <p className="text-xs text-slate-500">
                No hay rechazos registrados. Agrega filas para registrar causas y
                kg de fruta rechazada.
              </p>
            )}

            {localRechazos.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-xs md:text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-2 text-left font-medium">Causa</th>
                      <th className="p-2 text-right font-medium">Kg</th>
                      <th className="p-2 text-left font-medium">
                        Observación
                      </th>
                      <th className="p-2 text-right font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {localRechazos.map((row, index) => (
                      <tr key={index}>
                        <td className="p-2">
                          <select
  value={row.causa ?? ""}
  onChange={(e) => updateRechazoRow(index, "causa", e.target.value)}
  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs md:text-sm"
>
  <option value="">Selecciona causa…</option>
  {CAUSAS.map((opt) => (
    <option key={opt.value} value={opt.value}>
      {opt.label}
    </option>
  ))}
</select>

                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={row.kg ?? ""}
                            onChange={(e) =>
                              updateRechazoRow(index, "kg", e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs md:text-sm text-right"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.observacion ?? ""}
                            onChange={(e) =>
                              updateRechazoRow(
                                index,
                                "observacion",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs md:text-sm"
                            placeholder="Ej.: Golpes en manipulación"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeRechazoRow(index)}
                            className="text-xs text-rose-600 hover:text-rose-700"
                          >
                            Eliminar
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


        {/* footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-white flex justify-end gap-2">
          <button onClick={onClose} className={btnGhost}>Cancelar</button>
          <button onClick={handleSave} className={btnPrimary}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
