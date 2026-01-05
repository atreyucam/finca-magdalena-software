import { useState, useEffect } from "react";
import useToast from "../../hooks/useToast";
import { crearFinca, editarFinca, cambiarEstadoFinca } from "../../api/apiClient";
import Input from "../ui/Input";
import Boton from "../ui/Boton";
import { Save, Archive, RotateCcw } from "lucide-react";

function getApiErrorMessage(err) {
  const msg =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message;

  return msg && typeof msg === "string"
    ? msg
    : "No se pudo guardar la finca. Verifica los datos e inténtalo de nuevo.";
}

export default function FormularioFinca({ finca = null, alGuardar, alCancelar }) {
  // ✅ Edición si existe id
  const esEdicion = !!finca?.id;

  const [cargando, setCargando] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nombre: finca?.nombre ?? "",
    hectareas_totales: finca?.hectareas_totales ?? "",
    ubicacion: finca?.ubicacion ?? "",
  });

  const estadoActual = finca?.estado ?? "Activo";
  const estaActiva = estadoActual === "Activo";
  const notify = useToast();

  // ✅ si cambia la finca seleccionada, recargar formulario
  useEffect(() => {
    setForm({
      nombre: finca?.nombre ?? "",
      hectareas_totales: finca?.hectareas_totales ?? "",
      ubicacion: finca?.ubicacion ?? "",
    });
    setError("");
  }, [finca?.id]);

  const onChangeField = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cargando) return; // ✅ evita doble submit
    setCargando(true);
    setError("");

    try {
      const payload = {
        ...form,
        hectareas_totales:
          form.hectareas_totales === "" ? null : Number(form.hectareas_totales),
      };

      if (esEdicion) {
        await editarFinca(finca.id, payload);
        notify.success("Finca actualizada correctamente", { duration: 2500 });
      } else {
        await crearFinca(payload);
        notify.success("Finca registrada correctamente", { duration: 2500 });
      }

      alGuardar();
    } catch (err) {
      const msg = getApiErrorMessage(err);
      setError(msg);
    } finally {
      setCargando(false);
    }
  };


    const handleToggleEstado = async () => {
    if (!esEdicion || cambiandoEstado) return;

    const nuevoEstado = estaActiva ? "Inactivo" : "Activo";

    const ok = window.confirm(
      estaActiva
        ? "¿Seguro que deseas DESACTIVAR esta finca? No se mostrará en la lista principal."
        : "¿Deseas REACTIVAR esta finca para que vuelva a mostrarse?"
    );

    if (!ok) return;

    try {
      setCambiandoEstado(true);
      setError("");

      await cambiarEstadoFinca(finca.id, { estado: nuevoEstado });
      // también podrías mandar {} y que haga toggle, pero así queda explícito

      notify.success(
        nuevoEstado === "Inactivo"
          ? "Finca desactivada correctamente"
          : "Finca reactivada correctamente",
        { duration: 2500 }
      );

      // refresca todo (tu Produccion ya recarga fincas/cosechas + notifs)
      await alGuardar();
    } catch (err) {
      const msg = getApiErrorMessage(err);
      setError(msg);
    } finally {
      setCambiandoEstado(false);
    }
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-rose-800">
                No se pudo guardar - Verifica que no exista una finca con el mismo nombre.
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

      <Input
        label="Nombre de la Finca"
        value={form.nombre}
        onChange={onChangeField("nombre")}
        required
        placeholder="Ej: Finca Rosa"
      />

      <Input
        label="Hectáreas Totales"
        type="number"
        step="0.1"
        value={form.hectareas_totales}
        onChange={onChangeField("hectareas_totales")}
        required
      />

      <Input
        label="Ubicación / Sector"
        value={form.ubicacion}
        onChange={onChangeField("ubicacion")}
        placeholder="Ej: Sangay, Palora"
      />

      <div className="flex justify-between gap-3 pt-4 border-t border-slate-100">
  {/* IZQUIERDA: activar/desactivar */}
  <div>
    {esEdicion && (
      <Boton
        type="button"
        variante="peligro"
        onClick={handleToggleEstado}
        cargando={cambiandoEstado}
        icono={estaActiva ? Archive : RotateCcw}
        className={`border ${estaActiva ? "peligro" : "primario"}`}
      >
        {estaActiva ? "Desactivar finca" : "Reactivar finca"}
      </Boton>
    )}
  </div>

  {/* DERECHA: cancelar/guardar */}
  <div className="flex gap-3">
    <Boton variante="fantasma" onClick={alCancelar} type="button">
      Cancelar
    </Boton>

    <Boton tipo="submit" cargando={cargando} icono={Save}>
      {esEdicion ? "Guardar cambios" : "Guardar Finca"}
    </Boton>
  </div>
</div>

    </form>
  );
}
