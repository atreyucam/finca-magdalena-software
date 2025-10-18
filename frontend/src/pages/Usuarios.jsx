import { useEffect, useState } from "react";
import { listarUsuarios } from "../api/apiClient";
import CrearUsuarioModal from "../components/CrearUsuarioModal";
import { useNavigate } from "react-router-dom";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filtros, setFiltros] = useState({ q: "", estado: "", role: "" });
  const [showModal, setShowModal] = useState(false);

  const navigate = useNavigate();

  // Cargar usuarios desde API
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

  useEffect(() => {
    fetchUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  // Métricas
  const total = usuarios.length;
  const activos = usuarios.filter((u) => u.estado === "Activo").length;
  const inactivos = usuarios.filter((u) => u.estado === "Inactivo").length;

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros((f) => ({ ...f, [name]: value }));
  };

  return (
    // Fondo gris de toda la vista + padding que “compensa” el padding del <main>
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Card contenedora */}
      <div className="mx-auto max-w-[1400px] rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
            <p className="text-slate-500">Gestión de usuarios, pagos y tareas asignadas.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-700"
            >
              Crear usuario
            </button>
          </div>
        </div>

        {/* Cards métricas */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Registrados (azul) */}
          <div className="rounded-2xl border border-slate-200 bg-sky-50 p-4 sm:p-5">
            <div className="text-slate-600">Usuarios registrados</div>
            <div className="mt-1 text-3xl font-bold text-slate-900">{total}</div>
          </div>
          {/* Activos (verde) */}
          <div className="rounded-2xl border border-slate-200 bg-emerald-50 p-4 sm:p-5">
            <div className="text-slate-600">Usuarios activos</div>
            <div className="mt-1 text-3xl font-bold text-emerald-700">{activos}</div>
          </div>
          {/* Inactivos (rojo) */}
          <div className="rounded-2xl border border-slate-200 bg-rose-50 p-4 sm:p-5">
            <div className="text-slate-600">Usuarios inactivos</div>
            <div className="mt-1 text-3xl font-bold text-rose-600">{inactivos}</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="text"
            name="q"
            value={filtros.q}
            onChange={handleFiltroChange}
            placeholder="Buscar por nombre, email o cédula"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />

          <select
            name="estado"
            value={filtros.estado}
            onChange={handleFiltroChange}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
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
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option value="">Todos los roles</option>
            <option value="Propietario">Propietario</option>
            <option value="Tecnico">Técnico</option>
            <option value="Trabajador">Trabajador</option>
          </select>

          <button
            onClick={() => setFiltros({ q: "", estado: "", role: "" })}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Limpiar filtros
          </button>
        </div>

        {/* Tabla */}
        {loading && <p className="text-slate-500">Cargando usuarios…</p>}
        {error && <p className="text-rose-600">{error}</p>}
        {!loading && usuarios.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
            No hay usuarios registrados.
          </div>
        )}

        {!loading && usuarios.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">ID</th>
                  <th className="px-4 py-3 text-left font-medium">Nombres</th>
                  <th className="px-4 py-3 text-left font-medium">Rol</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Estado</th>
                  <th className="px-4 py-3 text-left font-medium">Fecha ingreso</th>
                  <th className="px-4 py-3 text-left font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {usuarios.map((u) => (
                  <tr key={u.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{u.id}</td>
                    <td className="px-4 py-3 text-slate-900">
                      {u.nombres} {u.apellidos}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{u.role}</td>
                    <td className="px-4 py-3 text-slate-700">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                          u.estado === "Activo"
                            ? "bg-emerald-100 text-emerald-700"
                            : u.estado === "Inactivo"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-700",
                        ].join(" ")}
                      >
                        {u.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {u.fecha_ingreso ? new Date(u.fecha_ingreso).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => navigate(`/owner/usuarios/${u.id}`)}
                          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Ver
                        </button>
                        <button
                          className={[
                            "rounded-xl px-3 py-1.5 text-xs font-semibold",
                            u.estado === "Activo"
                              ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                              : "bg-emerald-600 text-white hover:bg-emerald-700",
                          ].join(" ")}
                        >
                          {u.estado === "Activo" ? "Desactivar" : "Activar"}
                        </button>
                      </div>
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
      </div>
    </section>
  );
}
