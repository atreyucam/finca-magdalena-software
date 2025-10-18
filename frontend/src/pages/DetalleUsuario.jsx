// DetalleUsuario.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  obtenerUsuario,
  listarTareas,
  obtenerSemanaPorUsuario,
} from "../api/apiClient";
import { Tab } from "@headlessui/react";
import { ArrowLeft, Edit, CheckCircle, XCircle, Facebook, Linkedin, Twitter } from "lucide-react";

export default function DetalleUsuario() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagos, setPagos] = useState([]);
  const [tareas, setTareas] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const uRes = await obtenerUsuario(id);
        setUsuario(uRes.data);

        const pagosRes = await obtenerSemanaPorUsuario(id);
        setPagos(pagosRes?.data || []);

        const tareasRes = await listarTareas({ asignadoA: id });
        setTareas(tareasRes.data?.data || []);
      } catch (err) {
        console.error("Error cargando detalle de usuario:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <p className="text-slate-500 p-6">Cargando detalle...</p>;
  if (!usuario) return <p className="text-rose-600 p-6">Usuario no encontrado</p>;

  const inicial = (usuario.nombres || "?").charAt(0).toUpperCase();

  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto mb-4">
        <button
          onClick={() => navigate("/owner/usuarios")}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* === PERFIL (centrado) === */}
        <aside className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-sky-100 flex items-center justify-center text-4xl font-bold text-sky-700">
              {inicial}
            </div>

            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              {usuario.nombres} {usuario.apellidos}
            </h2>
            <p className="text-slate-500">{usuario.role}</p>

            <span
              className={[
                "mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
                usuario.estado === "Activo"
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-block h-2 w-2 rounded-full",
                  usuario.estado === "Activo" ? "bg-emerald-500" : "bg-rose-500",
                ].join(" ")}
              />
              {usuario.estado}
            </span>

   
          </div>

          {/* Datos */}
          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900 break-all">{usuario.email}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Teléfono</dt>
              <dd className="font-medium text-slate-900">{usuario.telefono || "-"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Dirección</dt>
              <dd className="font-medium text-slate-900">{usuario.direccion || "-"}</dd>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-slate-500">Cédula</dt>
                <dd className="font-medium text-slate-900">{usuario.cedula}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Fecha ingreso</dt>
                <dd className="font-medium text-slate-900">{usuario.fecha_ingreso || "-"}</dd>
              </div>
            </div>
          </dl>

       {/* Acciones */}
<div className="mt-6 border-t border-slate-200 pt-5">
  <button className="mb-3 w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700">
    <Edit size={16} /> Editar
  </button>

  {usuario.estado === "Activo" ? (
    <button className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700">
      <XCircle size={18} /> Desactivar
    </button>
  ) : (
    <button className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700">
      <CheckCircle size={18} /> Activar
    </button>
  )}
</div>

        </aside>

        {/* === TABS / CONTENIDO === */}
        <main className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 sm:p-6">
          <Tab.Group>
            <Tab.List className="flex gap-3 border-b border-slate-200 px-1">
              <Tab className="ui-selected:text-sky-700 ui-selected:border-sky-600 -mb-px border-b-2 border-transparent px-2.5 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
                Pagos
              </Tab>
              <Tab className="ui-selected:text-sky-700 ui-selected:border-sky-600 -mb-px border-b-2 border-transparent px-2.5 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
                Tareas
              </Tab>
            </Tab.List>

            <Tab.Panels className="mt-5">
              <Tab.Panel>
                {pagos.length === 0 ? (
                  <p className="text-slate-500">No hay pagos registrados.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold">Semana</th>
                          <th className="px-4 py-2 text-left font-semibold">Estado</th>
                          <th className="px-4 py-2 text-left font-semibold">Fecha inicio</th>
                          <th className="px-4 py-2 text-left font-semibold">Fecha fin</th>
                          <th className="px-4 py-2 text-left font-semibold">Monto</th>
                          <th className="px-4 py-2 text-left font-semibold">Recibo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {pagos.map((p) => (
                          <tr key={p.id} className="bg-white hover:bg-slate-50">
                            <td className="px-4 py-2">{p.semana_iso}</td>
                            <td className="px-4 py-2">
                              <span
                                className={[
                                  "inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
                                  p.estado === "Pagado"
                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                    : p.estado === "Pendiente"
                                    ? "bg-amber-50 text-amber-700 ring-amber-200"
                                    : "bg-slate-50 text-slate-700 ring-slate-200",
                                ].join(" ")}
                              >
                                <span
                                  className={[
                                    "h-1.5 w-1.5 rounded-full",
                                    p.estado === "Pagado"
                                      ? "bg-emerald-500"
                                      : p.estado === "Pendiente"
                                      ? "bg-amber-500"
                                      : "bg-slate-400",
                                  ].join(" ")}
                                />
                                {p.estado}
                              </span>
                            </td>
                            <td className="px-4 py-2">{p.fecha_inicio}</td>
                            <td className="px-4 py-2">{p.fecha_fin}</td>
                            <td className="px-4 py-2">${p.monto_total}</td>
                            <td className="px-4 py-2">
                              {p.recibo_pdf_path ? (
                                <a
                                  href={p.recibo_pdf_path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sky-700 hover:underline"
                                >
                                  Ver recibo
                                </a>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Tab.Panel>

              <Tab.Panel>
                {tareas.length === 0 ? (
                  <p className="text-slate-500">No hay tareas asignadas.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold">ID</th>
                          <th className="px-4 py-2 text-left font-semibold">Tipo</th>
                          <th className="px-4 py-2 text-left font-semibold">Lote</th>
                          <th className="px-4 py-2 text-left font-semibold">Estado</th>
                          <th className="px-4 py-2 text-left font-semibold">Fecha</th>
                          <th className="px-4 py-2 text-left font-semibold">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {tareas.map((t) => (
                          <tr key={t.id} className="bg-white hover:bg-slate-50">
                            <td className="px-4 py-2">{t.id}</td>
                            <td className="px-4 py-2">{t.tipo}</td>
                            <td className="px-4 py-2">{t.lote}</td>
                            <td className="px-4 py-2">{t.estado}</td>
                            <td className="px-4 py-2">
                              {new Date(t.fecha_programada).toLocaleDateString()}
                            </td>
                            
                            <td className="px-4 py-2">
                              <button className="inline-flex items-center rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                                Ver detalle
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </main>
      </div>
    </section>
  );
}
