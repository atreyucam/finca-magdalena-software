import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  obtenerUsuario,
  listarTareas,
  obtenerSemanaPorUsuario,
} from "../api/apiClient";
import { Tab } from "@headlessui/react";
import { ArrowLeft, Edit, CheckCircle, XCircle } from "lucide-react";

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

  if (loading) return <p className="text-gray-500">Cargando detalle...</p>;
  if (!usuario) return <p className="text-red-500">Usuario no encontrado</p>;

  return (
    <section className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate("/owner/usuarios")}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver
        </button>
      </div>

      {/* Perfil */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
            {usuario.nombres[0]}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              {usuario.nombres} {usuario.apellidos}
            </h1>
            <p className="text-gray-600">{usuario.role}</p>
            <span
              className={`inline-block px-2 py-1 text-xs rounded ${
                usuario.estado === "Activo"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {usuario.estado}
            </span>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1">
              <Edit size={16} /> Editar
            </button>
            {usuario.estado === "Activo" ? (
              <button className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-1">
                <XCircle size={16} /> Desactivar
              </button>
            ) : (
              <button className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-1">
                <CheckCircle size={16} /> Activar
              </button>
            )}
          </div>
        </div>

        {/* Datos personales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-sm">
          <p><strong>Cédula:</strong> {usuario.cedula}</p>
          <p><strong>Email:</strong> {usuario.email}</p>
          <p><strong>Teléfono:</strong> {usuario.telefono || "-"}</p>
          <p><strong>Dirección:</strong> {usuario.direccion || "-"}</p>
          <p><strong>Fecha ingreso:</strong> {usuario.fecha_ingreso}</p>
          <p><strong>Rol:</strong> {usuario.role}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tab.Group>
        <Tab.List className="flex gap-2 border-b mb-4">
          <Tab className="px-4 py-2 font-medium ui-selected:border-b-2 ui-selected:border-blue-600 ui-selected:text-blue-600">
            Pagos
          </Tab>
          <Tab className="px-4 py-2 font-medium ui-selected:border-b-2 ui-selected:border-blue-600 ui-selected:text-blue-600">
            Tareas
          </Tab>
        </Tab.List>

        <Tab.Panels>
          {/* Pagos */}
          <Tab.Panel>
            {pagos.length === 0 ? (
              <p className="text-gray-500">No hay pagos registrados</p>
            ) : (
              <table className="w-full text-sm border rounded">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Semana</th>
                    <th className="px-4 py-2 text-left">Estado</th>
                    <th className="px-4 py-2 text-left">Fecha inicio</th>
                    <th className="px-4 py-2 text-left">Fecha fin</th>
                    <th className="px-4 py-2 text-left">Monto</th>
                    <th className="px-4 py-2 text-left">Recibo</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-4 py-2">{p.semana_iso}</td>
                      <td className="px-4 py-2">{p.estado}</td>
                      <td className="px-4 py-2">{p.fecha_inicio}</td>
                      <td className="px-4 py-2">{p.fecha_fin}</td>
                      <td className="px-4 py-2">${p.monto_total}</td>
                      <td className="px-4 py-2">
                        {p.recibo_pdf_path ? (
                          <a
                            href={p.recibo_pdf_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
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
            )}
          </Tab.Panel>

          {/* Tareas */}
          <Tab.Panel>
            {tareas.length === 0 ? (
              <p className="text-gray-500">No hay tareas asignadas</p>
            ) : (
              <table className="w-full text-sm border rounded">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">ID</th>
                    <th className="px-4 py-2 text-left">Tipo</th>
                    <th className="px-4 py-2 text-left">Lote</th>
                    <th className="px-4 py-2 text-left">Estado</th>
                    <th className="px-4 py-2 text-left">Fecha</th>
                    <th className="px-4 py-2 text-left">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {tareas.map((t) => (
                    <tr key={t.id} className="border-t">
                      <td className="px-4 py-2">{t.id}</td>
                      <td className="px-4 py-2">{t.tipo}</td>
                      <td className="px-4 py-2">{t.lote}</td>
                      <td className="px-4 py-2">{t.estado}</td>
                      <td className="px-4 py-2">
                        {new Date(t.fecha_programada).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2">
                        <button className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </section>
  );
}
