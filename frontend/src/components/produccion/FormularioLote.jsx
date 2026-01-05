import { useEffect, useState } from "react";
import { crearLote, editarLote } from "../../api/apiClient";
import Input from "../ui/Input";
import Boton from "../ui/Boton";
import { Save } from "lucide-react";
import Select from "../ui/Select";
import useToast from "../../hooks/useToast";

function getApiErrorMessage(err) {
  const msg =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message;

  return msg && typeof msg === "string"
    ? msg
    : "No se pudo guardar el lote. Verifica los datos e inténtalo de nuevo.";
}

export default function FormularioLote({ fincas = [], lote = null, alGuardar, alCancelar }) {
  const esEdicion = !!lote?.id; // ✅ correcto
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    nombre: "",
    finca_id: "",
    superficie_ha: "",
    numero_plantas: "",
    fecha_siembra: "",
  });

  const notify = useToast();

  useEffect(() => {
    if (!esEdicion) return;

    setForm({
      nombre: lote?.nombre ?? "",
      finca_id: lote?.finca_id ?? "", // no lo editas, pero lo mantienes si existe
      superficie_ha: lote?.superficie_ha ?? "",
      numero_plantas: lote?.numero_plantas ?? "",
      // ✅ “date-only safe”
      fecha_siembra: lote?.fecha_siembra ? String(lote.fecha_siembra).slice(0, 10) : "",
    });
    setError("");
  }, [esEdicion, lote?.id]);

  const onChangeField = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cargando) return;
    setCargando(true);
    setError("");

    try {
      const payload = {
        nombre: form.nombre,
        superficie_ha: form.superficie_ha === "" ? null : Number(form.superficie_ha),
        numero_plantas: form.numero_plantas === "" ? null : Number(form.numero_plantas),
        // ✅ manda YYYY-MM-DD tal cual
        fecha_siembra: form.fecha_siembra || null,
      };

      if (!esEdicion) {
        // crear necesita finca_id
        await crearLote({ ...payload, finca_id: form.finca_id });
        notify.success("Lote creado correctamente", { duration: 2500 });
      } else {
        await editarLote(lote.id, payload);
        notify.success("Lote actualizado correctamente", { duration: 2500 });
      }

      alGuardar?.();
    } catch (err) {
      const msg = getApiErrorMessage(err);
      setError(msg);
      notify.error(msg, { duration: 3500 });
    } finally {
      setCargando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-rose-800">
                {esEdicion ? "No se pudo actualizar el lote" : "No se pudo crear el lote"}
              </p>
              <p className="text-sm text-rose-700 break-words">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError("")}
              className="h-8 w-8 shrink-0 grid place-items-center rounded-full hover:bg-rose-100 text-rose-700"
              aria-label="Cerrar"
              title="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ✅ Solo en CREAR */}
      {!esEdicion && (
        <Select
          label="Asignar a Finca"
          value={form.finca_id}
          onChange={onChangeField("finca_id")}
          required
        >
          <option value="">Seleccione finca...</option>
          {fincas.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nombre}
            </option>
          ))}
        </Select>
      )}

      <Input
        label="Nombre del lote"
        value={form.nombre}
        onChange={onChangeField("nombre")}
        required
        placeholder="Ej: Lote Norte"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Superficie (ha)"
          type="number"
          step="0.01"
          value={form.superficie_ha}
          onChange={onChangeField("superficie_ha")}
          required
        />
        <Input
          label="N° Plantas"
          type="number"
          value={form.numero_plantas}
          onChange={onChangeField("numero_plantas")}
          required
        />
      </div>

      <Input
        label="Fecha Siembra"
        type="date"
        value={form.fecha_siembra}
        onChange={onChangeField("fecha_siembra")}
      />

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Boton variante="fantasma" onClick={alCancelar} type="button">
          Cancelar
        </Boton>
        <Boton tipo="submit" cargando={cargando} icono={Save}>
          {esEdicion ? "Guardar cambios" : "Guardar Lote"}
        </Boton>
      </div>
    </form>
  );
}
