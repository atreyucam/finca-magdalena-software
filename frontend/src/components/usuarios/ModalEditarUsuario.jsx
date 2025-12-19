import { useState, useEffect } from "react";
import Input from "../ui/Input";
import Boton from "../ui/Boton";
import { Save, AlertTriangle } from "lucide-react"; // Importamos icono de alerta
import api from "../../api/apiClient";
import { toast } from "sonner";
import VentanaModal from "../ui/VentanaModal";

export default function ModalEditarUsuario({ usuario, abierto, cerrar, alGuardar }) {
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

  return (
    <VentanaModal abierto={abierto} cerrar={cerrar} titulo={`Editar: ${usuario?.nombres}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* SELECCIÓN DE TIPO DE VINCULACIÓN */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipo de Vinculación</label>
            <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm w-full hover:border-emerald-300 transition-colors">
                    <input 
                        type="radio" 
                        name="tipo" 
                        value="Fijo" 
                        checked={form.tipo === 'Fijo'} 
                        onChange={handleChange} 
                        className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                        <span className="block text-sm font-semibold text-slate-700">Fijo</span>
                        <span className="block text-[10px] text-slate-500">Usa la App</span>
                    </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm w-full hover:border-emerald-300 transition-colors">
                    <input 
                        type="radio" 
                        name="tipo" 
                        value="Esporadico" 
                        checked={form.tipo === 'Esporadico'} 
                        onChange={handleChange} 
                        className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                        <span className="block text-sm font-semibold text-slate-700">Esporádico</span>
                        <span className="block text-[10px] text-slate-500">Sin acceso</span>
                    </div>
                </label>
            </div>
        </div>

        {/* CAMPOS BASICOS */}
        <div className="grid grid-cols-2 gap-4">
           <Input label="Nombres" name="nombres" value={form.nombres || ''} onChange={handleChange} required />
           <Input label="Apellidos" name="apellidos" value={form.apellidos || ''} onChange={handleChange} required />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
            <Input label="Cédula" name="cedula" value={form.cedula || ''} onChange={handleChange} required />
            <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Rol</label>
                <select 
                    name="role" 
                    value={form.role || 'Trabajador'} 
                    onChange={handleChange} 
                    disabled={form.tipo === 'Esporadico'} // Deshabilitado si es Esporádico
                    className={`w-full rounded-xl border p-2.5 text-sm ${form.tipo === 'Esporadico' ? 'bg-slate-100 text-slate-400' : 'bg-white border-slate-300'}`}
                >
                    <option value="Trabajador">Trabajador</option>
                    <option value="Tecnico">Técnico</option>
                    <option value="Propietario">Propietario</option>
                </select>
                {form.tipo === 'Esporadico' && <p className="text-[10px] text-slate-500 mt-1">Solo puede ser Trabajador</p>}
            </div>
        </div>

        <Input label="Teléfono" name="telefono" value={form.telefono || ''} onChange={handleChange} />
        <Input label="Dirección" name="direccion" value={form.direccion || ''} onChange={handleChange} />

        {/* Fecha de ingreso: SOLO LECTURA */}
        <div className="flex flex-col gap-1 opacity-75">
            <label className="text-xs font-bold text-slate-500 uppercase">Fecha Ingreso</label>
            <div className="p-2.5 bg-slate-100 text-slate-500 rounded-xl text-sm border border-slate-200 cursor-not-allowed">
                {usuario?.fecha_ingreso} (No editable)
            </div>
        </div>

        <div className="border-t border-slate-100 my-2"></div>

        {/* SECCIÓN CREDENCIALES (Solo visible si es Fijo) */}
        {form.tipo === 'Fijo' && (
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 animate-in fade-in zoom-in-95">
                <h4 className="text-sm font-bold text-orange-800 mb-2 flex items-center gap-2">
                    Seguridad y Acceso
                    {usuario.tipo === 'Esporadico' && <span className="text-[10px] bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full">Requiere Configuración</span>}
                </h4>
                
                <Input label="Email" name="email" value={form.email || ''} onChange={handleChange} required placeholder="usuario@sistema.com" />
                
                <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                        <label className="text-xs font-bold text-slate-600 mb-1 block">
                            {usuario.tipo === 'Esporadico' ? 'Crear Contraseña (Obligatorio)' : 'Cambiar Contraseña (Opcional)'}
                        </label>
                        {usuario.tipo !== 'Esporadico' && (
                             <p className="text-[10px] text-slate-400 mb-2">Deja vacío para mantener la actual.</p>
                        )}
                    </div>
                    <Input placeholder="Nueva contraseña" type="password" name="password" value={form.password || ''} onChange={handleChange} />
                    <Input placeholder="Confirmar nueva" type="password" name="confirmPassword" value={form.confirmPassword || ''} onChange={handleChange} />
                </div>
            </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
            <Boton variante="fantasma" onClick={cerrar} type="button">Cancelar</Boton>
            <Boton tipo="submit" cargando={cargando} icono={Save}>Guardar Cambios</Boton>
        </div>
      </form>
    </VentanaModal>
  );
}