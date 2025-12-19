import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, Users, UserX, UserCheck, Edit, Eye 
} from "lucide-react";

// API
import { listarUsuarios, editarUsuario, desactivarUsuario, obtenerEstadisticas } from "../api/apiClient";

// Hooks
import useListado from "../hooks/useListado";

// Componentes UI
import { Tabla, TablaCabecera, TablaHead, TablaCuerpo, TablaFila, TablaCelda, TablaVacia } from "../components/ui/Tabla";
import Paginador from "../components/ui/Paginador";
import Boton from "../components/ui/Boton";

// IMPORTAMOS TUS MODALES (Asegúrate de que las rutas sean correctas)
import CrearUsuarioModal from "../components/usuarios/CrearUsuarioModal"; // El nuevo componente completo
import ModalEditarUsuario from "../components/usuarios/ModalEditarUsuario"; // El modal de edición

export default function Usuarios() {
  const navigate = useNavigate();
  
  // Estado para el Modal de Crear
  const [crearModalOpen, setCrearModalOpen] = useState(false);
  
  // Estado para el Modal de Editar
  const [usuarioAEditar, setUsuarioAEditar] = useState(null);

  const [stats, setStats] = useState({ registrados: 0, activos: 0, inactivos: 0 });

  // Hook para la Tabla
  const {
    datos: usuarios,
    cargando,
    pagina,
    setPagina,
    totalPaginas,
    totalRegistros,
    filtros,
    actualizarFiltro,
    limpiarFiltros,
    recargar
  } = useListado(listarUsuarios, { q: "", estado: "Activo", role: "", tipo: "" });

  const cargarStats = async () => {
    try {
      const res = await obtenerEstadisticas();
      // Aseguramos compatibilidad si viene directo o en .data
      setStats(res.data || res);
    } catch (e) {
      console.error("Error cargando stats:", e);
    }
  };

  useEffect(() => { cargarStats(); }, []);

  const toggleEstado = async (u) => {
    const esActivo = u.estado === "Activo";
    if (!window.confirm(`¿Deseas ${esActivo ? "desactivar" : "activar"} a ${u.nombres}?`)) return;

    try {
      if (esActivo) await desactivarUsuario(u.id);
      else await editarUsuario(u.id, { estado: "Activo" });
      recargar();
      cargarStats();
    } catch (e) {
      alert("Error al cambiar estado");
    }
  };

  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
            <p className="text-slate-500">Gestión de personal fijo y esporádico.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Abre el nuevo CrearUsuarioModal */}
            <Boton onClick={() => setCrearModalOpen(true)} icono={Plus}>
              Crear usuario
            </Boton>
          </div>
        </div>

        {/* CARDS MÉTRICAS */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-sky-50 p-4 sm:p-5">
            <div className="text-slate-600 font-medium">Total Personal</div>
            <div className="mt-1 text-3xl font-bold text-slate-900">{stats.registrados || 0}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-emerald-50 p-4 sm:p-5">
            <div className="text-slate-600 font-medium">Usuarios activos</div>
            <div className="mt-1 text-3xl font-bold text-emerald-700">{stats.activos || 0}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-rose-50 p-4 sm:p-5">
            <div className="text-slate-600 font-medium">Inactivos / Bloqueados</div>
            <div className="mt-1 text-3xl font-bold text-rose-600">{stats.inactivos || 0}</div>
          </div>
        </div>

        {/* FILTROS */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            value={filtros.q}
            onChange={(e) => actualizarFiltro("q", e.target.value)}
          />
          <select
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            value={filtros.estado}
            onChange={(e) => actualizarFiltro("estado", e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
            <option value="Bloqueado">Bloqueado</option>
          </select>
          <select
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            value={filtros.role}
            onChange={(e) => actualizarFiltro("role", e.target.value)}
          >
            <option value="">Todos los roles</option>
            <option value="Propietario">Propietario</option>
            <option value="Tecnico">Técnico</option>
            <option value="Trabajador">Trabajador</option>
          </select>
          <select
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            value={filtros.tipo}
            onChange={(e) => actualizarFiltro("tipo", e.target.value)}
          >
            <option value="">Todos los tipos</option>
            <option value="Fijo">Fijo</option>
            <option value="Esporadico">Esporádico</option>
          </select>
          <button
            onClick={limpiarFiltros}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Limpiar filtros
          </button>
        </div>

        {/* TABLA */}
        <Tabla>
          <TablaCabecera>
            <TablaHead>ID</TablaHead>
            <TablaHead>Nombres</TablaHead>
            <TablaHead>Rol</TablaHead>
            <TablaHead>Tipo</TablaHead>
            <TablaHead>Email / Acceso</TablaHead>
            <TablaHead>Estado</TablaHead>
            <TablaHead>Acciones</TablaHead>
          </TablaCabecera>

          <TablaCuerpo>
            {cargando ? (
              [...Array(5)].map((_, i) => (
                <TablaFila key={i}>
                  <TablaCelda colSpan={7} className="py-6">
                    <div className="h-4 w-full animate-pulse rounded bg-slate-100"></div>
                  </TablaCelda>
                </TablaFila>
              ))
            ) : usuarios.length === 0 ? (
              <TablaVacia mensaje="No se encontraron usuarios." colSpan={7} />
            ) : (
              usuarios.map((u) => (
                <TablaFila key={u.id}>
                  <TablaCelda className="text-slate-500 font-mono text-xs">{u.id}</TablaCelda>
                  
                  <TablaCelda>
                    <div className="font-bold text-slate-800">{u.nombres}</div>
                    <div className="text-xs text-slate-500">{u.apellidos}</div>
                  </TablaCelda>

                  <TablaCelda>
                    <div className="flex items-center gap-1.5">
                       <Users size={14} className="text-slate-400"/> {u.role}
                    </div>
                  </TablaCelda>

                  <TablaCelda>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${
                        u.tipo === 'Fijo' 
                          ? 'bg-blue-50 text-blue-700 border-blue-100' 
                          : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {u.tipo || 'Fijo'}
                    </span>
                  </TablaCelda>

                  <TablaCelda className="text-slate-600">
                    {u.email || <span className="italic text-slate-400 text-xs">Sin acceso</span>}
                  </TablaCelda>

                  <TablaCelda>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        u.estado === "Activo" 
                          ? "bg-emerald-100 text-emerald-700" 
                          : "bg-rose-100 text-rose-700"
                    }`}>
                      {u.estado}
                    </span>
                  </TablaCelda>

                  <TablaCelda>
                    <div className="flex items-center gap-2">
                      {/* 1. Botón Ver Detalle */}
                      <button
                        onClick={() => navigate(`/owner/usuarios/${u.id}`)}
                        title="Ver Detalles"
                        className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-sky-600 transition-colors shadow-sm"
                      >
                        <Eye size={16} />
                      </button>

                      {/* 2. Botón Editar (Abre el ModalEditarUsuario) */}
                      <button
                        onClick={() => setUsuarioAEditar(u)}
                        title="Editar Rápido"
                        className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-amber-600 transition-colors shadow-sm"
                      >
                        <Edit size={16} />
                      </button>

                      {/* 3. Botón Activar/Desactivar */}
                      <button
                        onClick={() => toggleEstado(u)}
                        title={u.estado === "Activo" ? "Desactivar" : "Activar"}
                        className={`p-1.5 rounded-xl border transition-all shadow-sm flex items-center justify-center ${
                          u.estado === "Activo"
                            ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                            : "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"
                        }`}
                      >
                        {u.estado === "Activo" ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                    </div>
                  </TablaCelda>
                </TablaFila>
              ))
            )}
          </TablaCuerpo>
        </Tabla>

        <div className="mt-4">
          <Paginador 
            paginaActual={pagina} 
            totalPaginas={totalPaginas} 
            onCambiarPagina={setPagina} 
            totalRegistros={totalRegistros}
          />
        </div>

      </div>

      {/* 1. MODAL DE CREACIÓN (El nuevo que mandaste) */}
      <CrearUsuarioModal 
        open={crearModalOpen}
        onClose={() => setCrearModalOpen(false)}
        onCreated={() => {
            recargar();
            cargarStats();
        }}
      />

      {/* 2. MODAL DE EDICIÓN (El que mandaste antes) */}
      {usuarioAEditar && (
        <ModalEditarUsuario 
           usuario={usuarioAEditar}
           abierto={!!usuarioAEditar}
           cerrar={() => setUsuarioAEditar(null)}
           alGuardar={() => {
               recargar();
               cargarStats(); // Recargamos stats por si cambió estado o tipo
               setUsuarioAEditar(null);
           }}
        />
      )}

    </section>
  );
}