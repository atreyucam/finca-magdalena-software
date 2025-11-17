// src/pages/DetalleLote.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { obtenerLote } from "../api/apiClient";

export default function DetalleLote() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lote, setLote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLote = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await obtenerLote(id);
      const data = res.data || res; // por si tu API devuelve directo el objeto
      setLote(data);
    } catch (err) {
      console.error("Error cargando lote:", err);
      setError("No se pudo cargar la información del lote.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const formatearFecha = (fecha) => {
    if (!fecha) return "Sin registro";
    try {
      return new Date(fecha).toLocaleDateString("es-EC", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
    } catch {
      return fecha;
    }
  };

  if (loading) {
    return (
      <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[900px] rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
          <p className="text-sm text-slate-500">Cargando lote…</p>
        </div>
      </section>
    );
  }

  if (error || !lote) {
    return (
      <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[900px] rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
          <p className="mb-4 text-sm text-rose-600">{error || "Lote no encontrado."}</p>
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Volver
          </button>
        </div>
      </section>
    );
  }

  const estado = lote.estado || "Activo";
  const estadoClasses = [
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
    estado === "Activo"
      ? "bg-emerald-100 text-emerald-700"
      : estado === "Inactivo"
      ? "bg-rose-100 text-rose-700"
      : "bg-slate-100 text-slate-700",
  ].join(" ");

  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[900px] rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Detalle del lote
            </h1>
            <p className="text-slate-500">
              Información general del lote y su configuración básica.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Volver
            </button>
          </div>
        </div>

        {/* Card principal de datos */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {lote.nombre || `Lote #${lote.id}`}
              </h2>
              <p className="text-sm text-slate-500">
                ID interno: {lote.id}
              </p>
            </div>
            <span className={estadoClasses}>{estado}</span>
          </div>

          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Número de plantas
              </dt>
              <dd className="mt-1 text-sm text-slate-900">
                {lote.numero_plantas ?? "—"}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Superficie (ha)
              </dt>
              <dd className="mt-1 text-sm text-slate-900">
                {lote.superficie_ha ?? "—"}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Fecha de siembra
              </dt>
              <dd className="mt-1 text-sm text-slate-900">
                {formatearFecha(lote.fecha_siembra)}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Fecha de creación (registro)
              </dt>
              <dd className="mt-1 text-sm text-slate-900">
                {formatearFecha(lote.created_at)}
              </dd>
            </div>
          </dl>

          {/* Aquí luego puedes meter más secciones:
              - Tareas asociadas al lote
              - Uso de insumos por lote
              - Cosechas en las que participa, etc. */}
        </div>
      </div>
    </section>
  );
}
