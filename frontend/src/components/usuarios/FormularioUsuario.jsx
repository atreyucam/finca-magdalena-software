import { useState } from "react";
import Input from "../ui/Input"; // Asegúrate de tener este componente
import Boton from "../ui/Boton"; // Asegúrate de tener este componente
import { Save } from "lucide-react";
import api from "../../api/apiClient"; // O tu instancia de axios configurada
import { toast } from "sonner";

export default function FormularioUsuario({ alGuardar, alCancelar }) {
  const [cargando, setCargando] = useState(false);
  
  // Estado inicial
  const [form, setForm] = useState({
    nombres: "", apellidos: "", cedula: "", telefono: "", direccion: "",
    role: "Trabajador", tipo: "Fijo", 
    email: "", password: "", confirmPassword: "",
    fecha_ingreso: new Date().toISOString().split('T')[0] // Fecha actual por defecto
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Validaciones extra para usuario Fijo
    if (form.tipo === 'Fijo') {
        if (!form.email) return toast.error("El email es obligatorio para personal fijo");
        if (!form.password) return toast.error("La contraseña es obligatoria");
        if (form.password !== form.confirmPassword) return toast.error("Las contraseñas no coinciden");
    }

    setCargando(true);
    try {
      // Limpiamos datos antes de enviar
      const datos = { ...form };
      delete datos.confirmPassword; // No enviamos confirmación al back
      
      // Si es esporádico, forzamos null aunque el input tenga basura
      if (form.tipo === 'Esporadico') {
          datos.email = null;
          datos.password = null;
      }

      await api.post("/usuarios", datos);
      toast.success("Usuario creado correctamente");
      alGuardar();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Error al crear usuario");
    } finally {
      setCargando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Datos Personales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Nombres" name="nombres" required value={form.nombres} onChange={handleChange} />
        <Input label="Apellidos" name="apellidos" required value={form.apellidos} onChange={handleChange} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Cédula" name="cedula" required value={form.cedula} onChange={handleChange} />
        <Input label="Teléfono" name="telefono" value={form.telefono} onChange={handleChange} />
      </div>
      
      <Input label="Dirección" name="direccion" value={form.direccion} onChange={handleChange} />
      <Input label="Fecha Ingreso" type="date" name="fecha_ingreso" required value={form.fecha_ingreso} onChange={handleChange} />

      <div className="border-t border-slate-200 my-4"></div>

      {/* Configuración de Sistema */}
      <div className="grid grid-cols-2 gap-4">
        <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Tipo de Personal</label>
            <select name="tipo" value={form.tipo} onChange={handleChange} className="w-full rounded-xl border border-slate-300 p-2.5 text-sm bg-white">
                <option value="Fijo">Fijo (Con Acceso)</option>
                <option value="Esporadico">Esporádico (Sin Acceso)</option>
            </select>
        </div>
        <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Rol</label>
            <select name="role" value={form.role} onChange={handleChange} className="w-full rounded-xl border border-slate-300 p-2.5 text-sm bg-white">
                <option value="Trabajador">Trabajador</option>
                {/* Solo mostramos opciones admin si es Fijo */}
                {form.tipo === 'Fijo' && <option value="Tecnico">Técnico</option>}
                {form.tipo === 'Fijo' && <option value="Propietario">Propietario</option>}
            </select>
        </div>
      </div>

      {/* Credenciales (Solo visible si es Fijo) */}
      {form.tipo === 'Fijo' && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
            <h4 className="text-sm font-bold text-slate-800 mb-3">Credenciales de Acceso</h4>
            <Input label="Email" type="email" name="email" required value={form.email} onChange={handleChange} className="mb-3" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Contraseña" type="password" name="password" required value={form.password} onChange={handleChange} />
                <Input label="Confirmar Pass" type="password" name="confirmPassword" required value={form.confirmPassword} onChange={handleChange} />
            </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Boton variante="fantasma" onClick={alCancelar} type="button">Cancelar</Boton>
        <Boton tipo="submit" cargando={cargando} icono={Save}>Guardar Usuario</Boton>
      </div>
    </form>
  );
}