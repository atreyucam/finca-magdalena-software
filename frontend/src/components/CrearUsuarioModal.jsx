import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import useApi from "../hooks/useApi";

export default function CrearUsuarioModal({ open, onClose, onCreated }) {
  const panelRef = useRef(null);

  const [form, setForm] = useState({
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

  // estilos reutilizables
  const inputBase =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";
  const textareaBase =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";
  const btnPrimary =
    "inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-700 disabled:opacity-50";
  const btnGhost =
    "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";

  // accesibilidad + bloquear scroll fondo
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

  // validaciones
  const validate = () => {
    const newErrors = {};
    if (!/^\d{10}$/.test(form.cedula))
      newErrors.cedula = "La cédula debe tener 10 dígitos numéricos";
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(form.nombres))
      newErrors.nombres = "Los nombres solo pueden contener letras y espacios";
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(form.apellidos))
      newErrors.apellidos = "Los apellidos solo pueden contener letras y espacios";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "Debe ser un correo válido";
    if (form.telefono && !/^\d{10}$/.test(form.telefono))
      newErrors.telefono = "El teléfono debe tener 10 dígitos numéricos";
    if (!form.password || form.password.length < 6)
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
    if (form.password !== form.confirmPassword)
      newErrors.confirmPassword = "Las contraseñas no coinciden";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if ((name === "cedula" || name === "telefono") && !/^\d*$/.test(value)) return;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const payload = { ...form };
      delete payload.confirmPassword;
      const newUser = await callApi(
        "post",
        "/usuarios",
        payload,
        "Usuario creado correctamente ✅"
      );
      onCreated?.(newUser);
      onClose?.();
    } catch (_err) {}
  };

  if (!open) return null;

  return (
    // En móvil: full-screen (p-0). En desktop: centrado (sm:flex center + p-4)
    <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-[1px] p-0 sm:p-4 flex sm:items-center sm:justify-center">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Crear nuevo usuario"
        className={[
          // móvil: ocupa todo (sin bordes redondeados). desktop: card centrada
          "w-full max-w-none sm:max-w-[min(880px,calc(100vw-1rem))]",
          "h-[100dvh] sm:h-auto sm:max-h-[calc(100dvh-2rem)]",
          "rounded-none sm:rounded-2xl sm:border border-slate-200 bg-white shadow-[0_24px_60px_rgba(0,0,0,.18)]",
          // layout: header / scroll / footer
          "grid grid-rows-[auto,minmax(0,1fr),auto] overflow-hidden"
        ].join(" ")}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 lg:px-8 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Crear nuevo usuario</h2>
            <p className="text-xs sm:text-sm text-slate-500">Crea a nuevos usuarios por rol.</p>
          </div>
          <button
            type="button"
            onClick={() => !loading && onClose?.()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 text-slate-600"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido scrolleable (momentum en iOS) */}
        <div
          className="min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 lg:px-8 py-4"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <form
            id="crearUsuarioForm"
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-5 md:grid-cols-2"
          >
            {/* Cédula */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Cédula</label>
              <input
                type="text"
                name="cedula"
                value={form.cedula}
                onChange={handleChange}
                maxLength={10}
                className={`${inputBase} mt-1`}
                required
              />
              {errors.cedula && <p className="mt-1 text-sm text-rose-600">{errors.cedula}</p>}
            </div>

            {/* Nombres */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Nombres</label>
              <input
                type="text"
                name="nombres"
                value={form.nombres}
                onChange={handleChange}
                className={`${inputBase} mt-1`}
                required
              />
              {errors.nombres && <p className="mt-1 text-sm text-rose-600">{errors.nombres}</p>}
            </div>

            {/* Apellidos */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Apellidos</label>
              <input
                type="text"
                name="apellidos"
                value={form.apellidos}
                onChange={handleChange}
                className={`${inputBase} mt-1`}
                required
              />
              {errors.apellidos && <p className="mt-1 text-sm text-rose-600">{errors.apellidos}</p>}
            </div>

            {/* Rol */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Rol</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className={`${inputBase} mt-1`}
                required
              >
                <option value="Propietario">Propietario</option>
                <option value="Tecnico">Técnico</option>
                <option value="Trabajador">Trabajador</option>
              </select>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className={`${inputBase} mt-1`}
                required
              />
              {errors.email && <p className="mt-1 text-sm text-rose-600">{errors.email}</p>}
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Teléfono</label>
              <input
                type="text"
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                maxLength={10}
                className={`${inputBase} mt-1`}
              />
              {errors.telefono && <p className="mt-1 text-sm text-rose-600">{errors.telefono}</p>}
            </div>

            {/* Fecha de ingreso */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Fecha de ingreso</label>
              <input
                type="date"
                name="fecha_ingreso"
                value={form.fecha_ingreso}
                onChange={handleChange}
                className={`${inputBase} mt-1`}
                required
              />
            </div>

            {/* Dirección */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Dirección</label>
              <textarea
                name="direccion"
                value={form.direccion}
                onChange={handleChange}
                rows={2}
                className={`${textareaBase} mt-1`}
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className={`${inputBase} mt-1 pr-10`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-rose-600">{errors.password}</p>}
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Confirmar contraseña</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className={`${inputBase} mt-1 pr-10`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-rose-600">{errors.confirmPassword}</p>
              )}
            </div>
          </form>
        </div>

        {/* Footer fijo */}
        <div className="px-4 sm:px-6 lg:px-8 py-3 border-t border-slate-200 bg-white">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => !loading && onClose?.()}
              className={btnGhost}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="crearUsuarioForm"
              className={btnPrimary}
              disabled={loading}
            >
              {loading ? "Creando..." : "Crear usuario"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
