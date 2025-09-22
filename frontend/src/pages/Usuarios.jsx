import { useEffect, useState } from "react";
import { listarUsuarios } from "../api/apiClient";
import CrearUsuarioModal from "../components/CrearUsuarioModal";
import { useNavigate } from "react-router-dom";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filtros, setFiltros] = useState({
    q: "",
    estado: "",
    role: "",
  });

  const [showModal, setShowModal] = useState(false);

  const navigate = useNavigate();

  // 🔹 Cargar usuarios desde API
  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const res = await listarUsuarios(filtros);
      setUsuarios(res.data?.data || []);
      setError(null);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
      setError("No se pudieron cargar los usuarios");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Cargar al inicio y cuando cambien filtros
  useEffect(() => {
    fetchUsuarios();
  }, [filtros]);

  // 🔹 Contar métricas
  const total = usuarios.length;
  const activos = usuarios.filter((u) => u.estado === "Activo").length;
  const inactivos = usuarios.filter((u) => u.estado === "Inactivo").length;

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros((f) => ({ ...f, [name]: value }));
  };

  return (
    <section>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-gray-600">Gestión de usuarios, pagos y tareas asignadas.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Crear usuario
        </button>
      </div>

      {/* Cards métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-gray-500">Usuarios registrados</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-gray-500">Usuarios activos</p>
          <p className="text-2xl font-bold text-green-600">{activos}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-gray-500">Usuarios inactivos</p>
          <p className="text-2xl font-bold text-red-600">{inactivos}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 mb-4">
        <input
          type="text"
          name="q"
          value={filtros.q}
          onChange={handleFiltroChange}
          placeholder="Buscar por nombre, email o cédula"
          className="border rounded-md p-2 flex-1 min-w-[200px]"
        />

        <select
          name="estado"
          value={filtros.estado}
          onChange={handleFiltroChange}
          className="border rounded-md p-2"
        >
          <option value="">Todos los estados</option>
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
          <option value="Bloqueado">Bloqueado</option>
        </select>

        <select
          name="role"
          value={filtros.role}
          onChange={handleFiltroChange}
          className="border rounded-md p-2"
        >
          <option value="">Todos los roles</option>
          <option value="Propietario">Propietario</option>
          <option value="Tecnico">Técnico</option>
          <option value="Trabajador">Trabajador</option>
        </select>
      </div>

      {/* Tabla de usuarios */}
      {loading && <p className="text-gray-500">Cargando usuarios...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && usuarios.length === 0 && (
        <p className="text-gray-500">No hay usuarios registrados.</p>
      )}

      {!loading && usuarios.length > 0 && (
        <div className="overflow-x-auto border rounded-md bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Nombres</th>
                <th className="px-4 py-2 text-left">Rol</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left">Fecha ingreso</th>
                <th className="px-4 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-2">{u.id}</td>
                  <td className="px-4 py-2">
                    {u.nombres} {u.apellidos}
                  </td>
                  <td className="px-4 py-2">{u.role}</td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        u.estado === "Activo"
                          ? "bg-green-100 text-green-800"
                          : u.estado === "Inactivo"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {u.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {u.fecha_ingreso
                      ? new Date(u.fecha_ingreso).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-2 space-x-2">
                    <button
                      onClick={() => navigate(`/owner/usuarios/${u.id}`)}
                      className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Ver
                    </button>
                    <button className="px-2 py-1 bg-yellow-200 rounded hover:bg-yellow-300">
                      {u.estado === "Activo" ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Crear Usuario */}
      <CrearUsuarioModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => fetchUsuarios()}
      />
    </section>
  );
}
