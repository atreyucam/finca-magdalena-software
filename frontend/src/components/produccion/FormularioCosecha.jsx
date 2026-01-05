import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Save } from "lucide-react";

import Input from "../ui/Input";
import Select from "../ui/Select";
import Boton from "../ui/Boton";
import useToast from "../../hooks/useToast";
import { crearCosecha, previewSiguienteCosecha } from "../../api/apiClient";

function getApiError(err) {
  const data = err?.response?.data;
  return {
    status: err?.response?.status,
    code: data?.code,
    message:
      data?.message ||
      data?.error ||
      err?.message ||
      "No se pudo crear la cosecha. Verifica los datos e inténtalo de nuevo.",
    data: data?.data,
  };
}

export default function FormularioCosecha({ fincas, alGuardar, alCancelar }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [activa, setActiva] = useState(null);

  const [preview, setPreview] = useState({
    loading: false,
    codigoPreview: "",
  });

  const [form, setForm] = useState({
    nombre: "",
    finca_id: "",
    fecha_inicio: "", // OJO: tu Input está poniendo DD/MM/YYYY, backend ya lo soporta
  });

  const notify = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const base = useMemo(
    () => `/${location.pathname.split("/")[1] || "owner"}`,
    [location.pathname]
  );

  const onChangeField = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError("");
    if (activa) setActiva(null);
  };

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!form.finca_id || !form.fecha_inicio) {
        setPreview({ loading: false, codigoPreview: "" });
        return;
      }

      console.log("[PREVIEW INPUT]", {
  finca_id: form.finca_id,
  fecha_inicio: form.fecha_inicio,
  tipo_fecha: typeof form.fecha_inicio,
});


      try {
        setPreview((p) => ({ ...p, loading: true }));

        const res = await previewSiguienteCosecha({
          finca_id: form.finca_id,
          fecha_inicio: form.fecha_inicio,
        });

        if (!alive) return;

        setPreview({
          loading: false,
          codigoPreview: res?.data?.codigoPreview ?? "",
        });
      } catch (err) {
        if (!alive) return;
        setPreview({ loading: false, codigoPreview: "" });
      }
    }
    
    load();
    return () => {
      alive = false;
    };
  }, [form.finca_id, form.fecha_inicio]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError("");
    setActiva(null);

    try {
      await crearCosecha({
        nombre: form.nombre,
        finca_id: form.finca_id,
        fecha_inicio: form.fecha_inicio,
      });

      notify.success("Cosecha iniciada correctamente", { duration: 2500 });
      alGuardar?.();
    } catch (err) {
      const { code, message, data } = getApiError(err);

      if (code === "COSECHA_ACTIVA_EXISTE") {
        setError(message || "Ya existe una cosecha activa en esa finca.");
        if (data?.cosecha_id) setActiva({ id: data.cosecha_id, codigo: data.codigo });
        notify.warning("Ya existe una cosecha activa", { duration: 3200 });
      } else {
        setError(message || "Error al crear cosecha");
        notify.error(message || "Error al crear cosecha", { duration: 3000 });
      }
    } finally {
      setCargando(false);
    }
  };

  const disabledSubmit =
    cargando || !form.finca_id || !form.nombre || !form.fecha_inicio;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-rose-800">
                No se pudo iniciar la cosecha
              </p>
              <p className="text-sm text-rose-700 break-words">{error}</p>

              {activa?.id && (
                <button
                  type="button"
                  onClick={() => navigate(`${base}/detalleCosecha/${activa.id}`)}
                  className="mt-2 inline-flex text-sm font-semibold text-rose-800 underline underline-offset-2 hover:text-rose-900"
                >
                  Ver cosecha activa {activa.codigo ? `(${activa.codigo})` : ""}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setError("");
                setActiva(null);
              }}
              className="h-8 w-8 shrink-0 grid place-items-center rounded-full hover:bg-rose-100 text-rose-700"
              aria-label="Cerrar"
              title="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <Select
        label="Finca Destino"
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

      <Input
        label="Nombre"
        value={form.nombre}
        onChange={onChangeField("nombre")}
        required
        placeholder="Ej: Cosecha 2026-1"
      />

      <Input
        label="Fecha Inicio"
        type="date"
        value={form.fecha_inicio}
        onChange={onChangeField("fecha_inicio")}
        required
      />

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs text-slate-500">
          Código estimado (se confirma al guardar)
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900 break-words">
          {preview.loading ? "Calculando..." : preview.codigoPreview || "—"}
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Boton variante="fantasma" onClick={alCancelar} type="button">
          Cancelar
        </Boton>
        <Boton
          tipo="submit"
          cargando={cargando}
          icono={Save}
          disabled={disabledSubmit}
        >
          Iniciar Cosecha
        </Boton>
      </div>
    </form>
  );
}
