import { useState, useEffect, useRef } from "react";
import Input from "../ui/Input";
import Boton from "../ui/Boton";
import { Save, AlertTriangle, X, UserCog, KeyRound } from "lucide-react"; // Nuevos iconos
import api from "../../api/apiClient";
import { toast } from "sonner";

export default function ModalEditarUsuario({ usuario, abierto, cerrar, alGuardar }) {
  const panelRef = useRef(null); // Referencia para el click outside
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({});

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (usuario && abierto) {
      setForm({
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        cedula: usuario.cedula,
        email: usuario.email || "",
        telefono: usuario.telefono || "",
        direccion: usuario.direccion || "",
        role: usuario.role,
        tipo: usuario.tipo || "Fijo", // Carga el tipo actual
        password: "",
        confirmPassword: ""
      });
    }
  }, [usuario, abierto]);

  // ✅ Manejadores de cierre (Esc, click outside) - IGUAL QUE CREAR USUARIO
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e) => e.key === "Escape" && !cargando && cerrar?.();
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && !cargando) cerrar?.();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    
    // Bloquear scroll
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
      html.style.overflow = prevOverflow;
    };
  }, [abierto, cerrar, cargando]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setForm(prev => {
        const newState = { ...prev, [name]: value };

        // REGLA: Si cambia a Esporádico, el rol DEBE ser Trabajador
        if (name === 'tipo' && value === 'Esporadico') {
            newState.role = 'Trabajador';
            newState.email = '';     // Limpiamos visualmente
            newState.password = '';  // Limpiamos visualmente
        }
        return newState;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Validaciones Específicas según el Tipo
    if (form.tipo === 'Fijo') {
        if (!form.email) return toast.error("El email es obligatorio para personal fijo.");
        
        // CASO ESPECIAL: Si era Esporádico y ahora es Fijo, la contraseña es OBLIGATORIA
        if (usuario.tipo === 'Esporadico' && !form.password) {
            return toast.error("Debes asignar una contraseña al convertirlo a Fijo.");
        }

        // Si escribió contraseña, validar coincidencia
        if (form.password && form.password !== form.confirmPassword) {
            return toast.error("Las contraseñas no coinciden.");
        }
    }

    setCargando(true);
    try {
      const datos = { ...form };
      delete datos.confirmPassword;
      
      // Limpieza de datos para el Backend
      if (datos.tipo === 'Esporadico') {
          datos.email = null;     // Backend lo pondrá en null
          datos.password = null;  // Backend ignorará password
      } else {
          // Si es Fijo y la contraseña está vacía, la quitamos para que NO la cambie
          if (!datos.password) delete datos.password;
      }

      await api.patch(`/usuarios/${usuario.id}`, datos);
      toast.success("Usuario actualizado correctamente");
      alGuardar(); // Recarga la tabla
      cerrar();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error al editar");
    } finally {
      setCargando(false);
    }
  };

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-[1px] p-0 sm:p-4 flex sm:items-center sm:justify-center">
      <div ref={panelRef} className="w-full max-w-none sm:max-w-3xl h-[100dvh] sm:h-auto sm:max-h-[calc(100dvh-2rem)] bg-white shadow-[0_24px_60px_rgba(0,0,0,.18)] sm:rounded-2xl border border-slate-200 flex flex-col overflow-hidden">
        
        {/* ✅ HEADER PERSONALIZADO (Estilo Ámbar para Editar) */}
        <div className="flex-none px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-200 flex items-start justify-between bg-slate-50/30">
          <div className="flex items-center gap-3">
            {/* Icono con fondo Ámbar */}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
               <UserCog size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                Editar Usuario
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Modificar datos de {usuario?.nombres}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => !cargando && cerrar?.()} 
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ✅ BODY SCROLLABLE */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5">
          <form id="editarUsuarioForm" onSubmit={handleSubmit} className="space-y-5">
            
            {/* SELECCIÓN DE TIPO DE VINCULACIÓN */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Tipo de Vinculación</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className={`flex items-center gap-3 cursor-pointer px-4 py-3 rounded-xl border shadow-sm transition-all ${form.tipo === 'Fijo' ? 'bg-white border-emerald-500 ring-1 ring-emerald-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                        <input 
                            type="radio" 
                            name="tipo" 
                            value="Fijo" 
                            checked={form.tipo === 'Fijo'} 
                            onChange={handleChange} 
                            className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                            <span className="block text-sm font-bold text-slate-700">Personal Fijo</span>
                            <span className="block text-[10px] text-slate-500">Usa la App Móvil</span>
                        </div>
                    </label>
                    <label className={`flex items-center gap-3 cursor-pointer px-4 py-3 rounded-xl border shadow-sm transition-all ${form.tipo === 'Esporadico' ? 'bg-white border-emerald-500 ring-1 ring-emerald-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                        <input 
                            type="radio" 
                            name="tipo" 
                            value="Esporadico" 
                            checked={form.tipo === 'Esporadico'} 
                            onChange={handleChange} 
                            className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                            <span className="block text-sm font-bold text-slate-700">Esporádico</span>
                            <span className="block text-[10px] text-slate-500">Sin acceso al sistema</span>
                        </div>
                    </label>
                </div>
            </div>

            {/* CAMPOS PERSONALES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Nombres" name="nombres" value={form.nombres || ''} onChange={handleChange} required />
                <Input label="Apellidos" name="apellidos" value={form.apellidos || ''} onChange={handleChange} required />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Cédula" name="cedula" value={form.cedula || ''} onChange={handleChange} required />
                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Rol</label>
                    <select 
                        name="role" 
                        value={form.role || 'Trabajador'} 
                        onChange={handleChange} 
                        disabled={form.tipo === 'Esporadico'}
                        className={`w-full rounded-xl border p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 ${form.tipo === 'Esporadico' ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white border-slate-300'}`}
                    >
                        <option value="Trabajador">Trabajador</option>
                        <option value="Tecnico">Técnico</option>
                        <option value="Propietario">Propietario</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Teléfono" name="telefono" value={form.telefono || ''} onChange={handleChange} />
                <Input label="Dirección" name="direccion" value={form.direccion || ''} onChange={handleChange} />
            </div>

            {/* SECCIÓN CREDENCIALES (Solo visible si es Fijo) */}
            {form.tipo === 'Fijo' && (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 animate-in fade-in zoom-in-95">
                    <h4 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                        <KeyRound size={16} />
                        Seguridad y Acceso
                        {usuario.tipo === 'Esporadico' && <span className="ml-auto text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">Requiere Configuración</span>}
                    </h4>
                    
                    <div className="space-y-4">
                        <Input label="Email" name="email" value={form.email || ''} onChange={handleChange} required placeholder="usuario@sistema.com" />
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className="text-xs font-bold text-slate-600 block mb-1">
                                    {usuario.tipo === 'Esporadico' ? 'Crear Contraseña (Obligatorio)' : 'Cambiar Contraseña (Opcional)'}
                                </label>
                                {usuario.tipo !== 'Esporadico' && (
                                     <p className="text-[10px] text-slate-400 mb-2">Deja los campos vacíos si no deseas cambiarla.</p>
                                )}
                            </div>
                            <Input placeholder="Nueva contraseña" type="password" name="password" value={form.password || ''} onChange={handleChange} />
                            <Input placeholder="Confirmar nueva" type="password" name="confirmPassword" value={form.confirmPassword || ''} onChange={handleChange} />
                        </div>
                    </div>
                </div>
            )}

          </form>
        </div>

        {/* ✅ FOOTER FIJO */}
        <div className="flex-none px-4 sm:px-6 lg:px-8 py-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex justify-end gap-3">
            <Boton variante="fantasma" onClick={cerrar} type="button" disabled={cargando} className="bg-white border-slate-300">
                Cancelar
            </Boton>
            <Boton tipo="submit" form="editarUsuarioForm" cargando={cargando} icono={Save}>
                Guardar Cambios
            </Boton>
          </div>
        </div>

      </div>
    </div>
  );
}