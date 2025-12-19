import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import useApi from "../../hooks/useApi";

export default function CrearUsuarioModal({ open, onClose, onCreated }) {
  const panelRef = useRef(null);
  
  // Estado inicial incluyendo 'tipo'
  const [form, setForm] = useState({
    tipo: "Fijo", // Default
    cedula: "",
    nombres: "",
    apellidos: "",
    email: "",
    telefono: "",
    direccion: "",
    fecha_ingreso: new Date().toISOString().split("T")[0],
    role: "Trabajador",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { callApi, loading } = useApi();

  const inputBase = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";
  const textareaBase = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";
  const btnPrimary = "inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-700 disabled:opacity-50";
  const btnGhost = "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";

  // Reset del formulario cuando se abre
  useEffect(() => {
    if (open) {
      setForm({
        tipo: "Fijo",
        cedula: "",
        nombres: "",
        apellidos: "",
        email: "",
        telefono: "",
        direccion: "",
        fecha_ingreso: new Date().toISOString().split("T")[0],
        role: "Trabajador",
        password: "",
        confirmPassword: "",
      });
      setErrors({});
    }
  }, [open]);

  // Manejadores de cierre (Esc, click outside)
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && !loading) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
      html.style.overflow = prevOverflow;
    };
  }, [open, onClose, loading]);

  const validate = () => {
    const newErrors = {};
    if (!/^\d{10}$/.test(form.cedula)) newErrors.cedula = "La cédula debe tener 10 dígitos numéricos";
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(form.nombres)) newErrors.nombres = "Solo letras y espacios";
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(form.apellidos)) newErrors.apellidos = "Solo letras y espacios";
    if (form.telefono && !/^\d{10}$/.test(form.telefono)) newErrors.telefono = "10 dígitos numéricos";

    // Validaciones condicionales para personal FIJO
    if (form.tipo === 'Fijo') {
      if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = "Correo inválido";
      if (!form.password || form.password.length < 6) newErrors.password = "Mínimo 6 caracteres";
      if (form.password !== form.confirmPassword) newErrors.confirmPassword = "Las contraseñas no coinciden";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if ((name === "cedula" || name === "telefono") && !/^\d*$/.test(value)) return;
    
    setForm((f) => {
        const newData = { ...f, [name]: value };
        // Si cambia a esporádico, forzamos el rol a Trabajador
        if (name === 'tipo' && value === 'Esporadico') {
            newData.role = 'Trabajador';
        }
        return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const payload = { ...form };
      delete payload.confirmPassword;
      // Limpiamos datos innecesarios si es esporádico
      if (payload.tipo === 'Esporadico') {
          payload.email = null;
          payload.password = null;
      }

      const newUser = await callApi("post", "/usuarios", payload, "Usuario creado correctamente ✅");
      onCreated?.(newUser);
      onClose?.();
    } catch (_err) {}
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-[1px] p-0 sm:p-4 flex sm:items-center sm:justify-center">
      <div ref={panelRef} className="w-full max-w-none sm:max-w-[min(880px,calc(100vw-1rem))] h-[100dvh] sm:h-auto sm:max-h-[calc(100dvh-2rem)] rounded-none sm:rounded-2xl sm:border border-slate-200 bg-white shadow-[0_24px_60px_rgba(0,0,0,.18)] grid grid-rows-[auto,minmax(0,1fr),auto] overflow-hidden">
        
        {/* Header */}
        <div className="px-4 sm:px-6 lg:px-8 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Crear nuevo usuario</h2>
            <p className="text-xs sm:text-sm text-slate-500">Registre personal fijo o esporádico.</p>
          </div>
          <button type="button" onClick={() => !loading && onClose?.()} className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4">
          <form id="crearUsuarioForm" onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
            
            {/* NUEVO: Selector de Tipo */}
            <div className="md:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="block text-sm font-medium text-slate-700 mb-2">Tipo de Vinculación:</span>
                <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="tipo" value="Fijo" checked={form.tipo === 'Fijo'} onChange={handleChange} className="text-emerald-600 focus:ring-emerald-500" />
                        <span className="text-sm text-slate-700">Personal Fijo (Usa App)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="tipo" value="Esporadico" checked={form.tipo === 'Esporadico'} onChange={handleChange} className="text-emerald-600 focus:ring-emerald-500" />
                        <span className="text-sm text-slate-700">Esporádico / Jornalero (Gestionado por Técnico)</span>
                    </label>
                </div>
            </div>

            {/* Cédula */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Cédula</label>
              <input type="text" name="cedula" value={form.cedula} onChange={handleChange} maxLength={10} className={`${inputBase} mt-1`} required />
              {errors.cedula && <p className="mt-1 text-sm text-rose-600">{errors.cedula}</p>}
            </div>

            {/* Rol */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Rol</label>
              <select name="role" value={form.role} onChange={handleChange} className={`${inputBase} mt-1`} disabled={form.tipo === 'Esporadico'}>
                <option value="Trabajador">Trabajador</option>
                {form.tipo === 'Fijo' && (
                    <>
                        <option value="Tecnico">Técnico</option>
                        <option value="Propietario">Propietario</option>
                    </>
                )}
              </select>
              {form.tipo === 'Esporadico' && <p className="text-xs text-slate-500 mt-1">Los esporádicos son siempre trabajadores.</p>}
            </div>

            {/* Nombres y Apellidos */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Nombres</label>
              <input type="text" name="nombres" value={form.nombres} onChange={handleChange} className={`${inputBase} mt-1`} required />
              {errors.nombres && <p className="mt-1 text-sm text-rose-600">{errors.nombres}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Apellidos</label>
              <input type="text" name="apellidos" value={form.apellidos} onChange={handleChange} className={`${inputBase} mt-1`} required />
              {errors.apellidos && <p className="mt-1 text-sm text-rose-600">{errors.apellidos}</p>}
            </div>

            {/* SECCIÓN CONDICIONAL: EMAIL Y PASSWORD (SOLO FIJOS) */}
            {form.tipo === 'Fijo' && (
                <>
                    <div className="md:col-span-2">
                        <div className="border-t border-slate-200 my-2"></div>
                        <p className="text-sm font-semibold text-emerald-700 mb-2">Credenciales de Acceso</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Email</label>
                        <input type="email" name="email" value={form.email} onChange={handleChange} className={`${inputBase} mt-1`} required />
                        {errors.email && <p className="mt-1 text-sm text-rose-600">{errors.email}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Teléfono</label>
                        <input type="text" name="telefono" value={form.telefono} onChange={handleChange} maxLength={10} className={`${inputBase} mt-1`} />
                        {errors.telefono && <p className="mt-1 text-sm text-rose-600">{errors.telefono}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Contraseña</label>
                        <div className="relative">
                            <input type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange} className={`${inputBase} mt-1 pr-10`} required />
                            <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700">
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {errors.password && <p className="mt-1 text-sm text-rose-600">{errors.password}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Confirmar contraseña</label>
                        <div className="relative">
                            <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={form.confirmPassword} onChange={handleChange} className={`${inputBase} mt-1 pr-10`} required />
                            <button type="button" onClick={() => setShowConfirmPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700">
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {errors.confirmPassword && <p className="mt-1 text-sm text-rose-600">{errors.confirmPassword}</p>}
                    </div>
                </>
            )}

            {/* SECCIÓN DATOS ADICIONALES (Visible para todos) */}
            <div className="md:col-span-2">
                <div className="border-t border-slate-200 my-2"></div>
            </div>
            {form.tipo === 'Esporadico' && (
                 <div>
                    <label className="block text-sm font-medium text-slate-700">Teléfono (Opcional)</label>
                    <input type="text" name="telefono" value={form.telefono} onChange={handleChange} maxLength={10} className={`${inputBase} mt-1`} />
                </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700">Fecha de ingreso</label>
              <input type="date" name="fecha_ingreso" value={form.fecha_ingreso} onChange={handleChange} className={`${inputBase} mt-1`} required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Dirección</label>
              <textarea name="direccion" value={form.direccion} onChange={handleChange} rows={2} className={`${textareaBase} mt-1`} />
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 lg:px-8 py-3 border-t border-slate-200 bg-white">
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => !loading && onClose?.()} className={btnGhost} disabled={loading}>Cancelar</button>
            <button type="submit" form="crearUsuarioForm" className={btnPrimary} disabled={loading}>
              {loading ? "Creando..." : "Crear usuario"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}