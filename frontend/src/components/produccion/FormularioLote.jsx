import { useEffect, useState } from "react";
import { crearLote, editarLote } from "../../api/apiClient";
import Input from "../ui/Input";
import Boton from "../ui/Boton";
import Select from "../ui/Select";
import useToast from "../../hooks/useToast";
import { Save, X, Layout } from "lucide-react";

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
  const esEdicion = !!lote?.id;
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
      finca_id: lote?.finca_id ?? "",
      superficie_ha: lote?.superficie_ha ?? "",
      numero_plantas: lote?.numero_plantas ?? "",
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
        fecha_siembra: form.fecha_siembra || null,
      };

      if (!esEdicion) {
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
    <div className="flex flex-col">
      {/* ✅ HEADER BONITO */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-200 flex items-start justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <Layout size={22} strokeWidth={2.5} />
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              {esEdicion ? "Editar lote" : "Nuevo Lote"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {esEdicion
                ? `Modifica la información del lote ${lote?.nombre ?? ""}.`
                : "Registra un lote para organizar el control por superficie y plantas."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={alCancelar}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Cerrar"
          title="Cerrar"
          disabled={cargando}
        >
          <X size={20} />
        </button>
      </div>

      {/* ✅ BODY + DISTRIBUCIÓN BONITA */}
      <form onSubmit={handleSubmit} className="space-y-4 px-4 sm:px-6 lg:px-8 py-5">
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

        {/* ✅ GRID PRINCIPAL */}
        <div className="grid grid-cols-1 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            label="Fecha siembra"
            type="date"
            value={form.fecha_siembra}
            onChange={onChangeField("fecha_siembra")}
          />
        </div>

        {/* ✅ FOOTER */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Boton variante="fantasma" onClick={alCancelar} type="button" disabled={cargando}>
            Cancelar
          </Boton>
          <Boton tipo="submit" cargando={cargando} icono={Save}>
            {esEdicion ? "Guardar cambios" : "Guardar Lote"}
          </Boton>
        </div>
      </form>
    </div>
  );
}
