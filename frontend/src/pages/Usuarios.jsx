import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, Users, UserX, UserCheck, Edit, Eye 
} from "lucide-react";
import { getSocket, connectSocket } from "../lib/socket";

// API
import { listarUsuarios, editarUsuario, 
  desactivarUsuario, obtenerEstadisticas } from "../api/apiClient";
import useAuthStore from "../store/authStore";
// Hooks
import useListado from "../hooks/useListado";

// Componentes UI
import { Tabla, TablaCabecera, TablaHead, TablaCuerpo, 
  TablaFila, TablaCelda, TablaVacia } from "../components/ui/Tabla";
import Paginador from "../components/ui/Paginador";
import Boton from "../components/ui/Boton";

// Modales
import CrearUsuarioModal from "../components/usuarios/CrearUsuarioModal"; 
import ModalEditarUsuario from "../components/usuarios/ModalEditarUsuario"; 

export default function Usuarios() {
  const navigate = useNavigate();
  const [crearModalOpen, setCrearModalOpen] = useState(false);
  const [usuarioAEditar, setUsuarioAEditar] = useState(null);
  const [stats, setStats] = useState({ registrados: 0, activos: 0, inactivos: 0 });
const me = useAuthStore((s) => s.user);
const myId = Number(me?.id);

const base =
  location.pathname.startsWith("/tech") ? "/tech" :
  location.pathname.startsWith("/worker") ? "/worker" :
  "/owner";
const esProtegido = (u) => !!u?.protegido;

// Técnico NO puede editar/desactivar a Propietarios (admins)
const tecnicoBloqueadoContraAdmin = (u) => me?.role === "Tecnico" && u?.role === "Propietario";


  // ✅ AQUÍ ESTÁ EL CAMBIO DE PAGINACIÓN: pageSize: 15
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
  } = useListado(listarUsuarios, { 
      q: "", 
      estado: "Activo", 
      role: "", 
      tipo: "", 
      pageSize: 15 // Paginación de 15 items
  });

  const cargarStats = async () => {
    try {
      const res = await obtenerEstadisticas();
      setStats(res.data || res);
    } catch (e) {
      console.error("Error cargando stats:", e);
    }
  };

  useEffect(() => { cargarStats(); }, []);
  useEffect(() => {
  connectSocket();
  const socket = getSocket();

  const onChanged = () => {
    recargar();
    cargarStats();
  };

  socket.on("usuarios:changed", onChanged);

  return () => {
    socket.off("usuarios:changed", onChanged);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


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

  const filtrarPorEstado = (nuevoEstado) => {
    actualizarFiltro("estado", nuevoEstado);
    setPagina(1);
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
            <Boton onClick={() => setCrearModalOpen(true)} icono={Plus}>
              Crear usuario
            </Boton>
          </div>
        </div>

        {/* CARDS */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div onClick={() => filtrarPorEstado("")} className={`cursor-pointer rounded-2xl border p-5 transition-all hover:shadow-md ${filtros.estado === "" ? "bg-slate-800 text-white border-slate-800 shadow-lg shadow-slate-200 ring-2 ring-slate-200 ring-offset-2" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            <div className="flex items-center gap-2 mb-2 opacity-90"><Users size={18} /><span className="text-xs font-bold uppercase tracking-wider">Total Personal</span></div>
            <div className="text-3xl font-black">{stats.registrados || 0}</div>
          </div>
          <div onClick={() => filtrarPorEstado("Activo")} className={`cursor-pointer rounded-2xl border p-5 transition-all hover:shadow-md ${filtros.estado === "Activo" ? "bg-emerald-100 border-emerald-200 text-emerald-900 ring-2 ring-emerald-100 ring-offset-1" : "bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100"}`}>
            <div className="flex items-center gap-2 mb-2"><UserCheck size={18} /><span className="text-xs font-bold uppercase tracking-wider opacity-90">Usuarios activos</span></div>
            <div className="text-3xl font-black">{stats.activos || 0}</div>
          </div>
          <div onClick={() => filtrarPorEstado("Inactivo")} className={`cursor-pointer rounded-2xl border p-5 transition-all hover:shadow-md ${["Inactivo", "Bloqueado"].includes(filtros.estado) ? "bg-rose-100 border-rose-200 text-rose-900 ring-2 ring-rose-100 ring-offset-1" : "bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100"}`}>
            <div className="flex items-center gap-2 mb-2"><UserX size={18} /><span className="text-xs font-bold uppercase tracking-wider opacity-90">Inactivos / Bloq.</span></div>
            <div className="text-3xl font-black">{stats.inactivos || 0}</div>
          </div>
        </div>

        {/* FILTROS */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input type="text" placeholder="Buscar por nombre..." className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200" value={filtros.q} onChange={(e) => actualizarFiltro("q", e.target.value)} />
          <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200" value={filtros.estado} onChange={(e) => actualizarFiltro("estado", e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
            <option value="Bloqueado">Bloqueado</option>
          </select>
          <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200" value={filtros.role} onChange={(e) => actualizarFiltro("role", e.target.value)}>
            <option value="">Todos los roles</option>
            <option value="Propietario">Propietario</option>
            <option value="Tecnico">Técnico</option>
            <option value="Trabajador">Trabajador</option>
          </select>
          <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200" value={filtros.tipo} onChange={(e) => actualizarFiltro("tipo", e.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="Fijo">Fijo</option>
            <option value="Esporadico">Esporádico</option>
          </select>
          <button onClick={limpiarFiltros} className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Limpiar filtros</button>
        </div>

        {/* TABLA */}
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="bg-slate-50">
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
                      <TablaFila key={i}><TablaCelda colSpan={7} className="py-6"><div className="h-4 w-full animate-pulse rounded bg-slate-100"></div></TablaCelda></TablaFila>
                    ))
                  ) : usuarios.length === 0 ? (
                    <TablaVacia mensaje="No se encontraron usuarios." colSpan={7} />
                  ) : (
                    usuarios.map((u) => (
                      <TablaFila key={u.id}>
                        <TablaCelda className="text-slate-500 font-mono text-xs">{u.id}</TablaCelda>
                        <TablaCelda><div className="font-bold text-slate-800">{u.nombres}</div><div className="text-xs text-slate-500">{u.apellidos}</div></TablaCelda>
                        <TablaCelda><div className="flex items-center gap-1.5"><Users size={14} className="text-slate-400" /> {u.role}</div></TablaCelda>
                        <TablaCelda><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${u.tipo === "Fijo" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>{u.tipo || "Fijo"}</span></TablaCelda>
                        <TablaCelda className="text-slate-600">{u.email || <span className="italic text-slate-400 text-xs">Sin acceso</span>}</TablaCelda>
                        <TablaCelda><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${u.estado === "Activo" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{u.estado}</span></TablaCelda>
                        <TablaCelda>
  <div className="flex items-center gap-2">
    {/* VER: siempre */}
    <button
      onClick={() => navigate(`${base}/usuarios/${u.id}`)}
      title="Ver Detalles"
      className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-sky-600 transition-colors shadow-sm"
    >
      <Eye size={16} />
    </button>

    {/* EDITAR: oculto si técnico intenta tocar admin */}
    {!tecnicoBloqueadoContraAdmin(u) && (
      <button
        onClick={() => setUsuarioAEditar(u)}
        title="Editar Rápido"
        className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-amber-600 transition-colors shadow-sm"
      >
        <Edit size={16} />
      </button>
    )}

    {/* DESACTIVAR: oculto si es protegido, o si técnico contra admin */}
    {!esProtegido(u) && !tecnicoBloqueadoContraAdmin(u) && (
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
    )}

    {/* etiquetas */}
    {esProtegido(u) && (
      <span className="ml-2 text-xs font-semibold text-slate-400">Usuario protegido</span>
    )}
    {tecnicoBloqueadoContraAdmin(u) && (
      <span className="ml-2 text-xs font-semibold text-slate-400">Sin permisos</span>
    )}
  </div>
</TablaCelda>


                      </TablaFila>
                    ))
                  )}
                </TablaCuerpo>
              </Tabla>
          </div>
          
          <Paginador
            paginaActual={pagina}
            totalPaginas={totalPaginas}
            onCambiarPagina={setPagina}
            totalRegistros={totalRegistros}
          />
        </div>
      </div>

      {/* 1. MODAL DE CREACIÓN */}
<CrearUsuarioModal
  open={crearModalOpen}
  onClose={() => setCrearModalOpen(false)}
 onCreated={(nuevo) => {
  console.log("✅ onCreated ejecutado. nuevo:", nuevo);

  setCrearModalOpen(false);

  if (pagina === 1) recargar();
  else setPagina(1);

  cargarStats();
}}

/>



      {/* 2. MODAL DE EDICIÓN */}
      {usuarioAEditar && (
        <ModalEditarUsuario 
           usuario={usuarioAEditar}
           abierto={!!usuarioAEditar}
           cerrar={() => setUsuarioAEditar(null)}
           alGuardar={() => {
               recargar();
               cargarStats(); 
               setUsuarioAEditar(null);
           }}
        />
      )}

    </section>
  );
}