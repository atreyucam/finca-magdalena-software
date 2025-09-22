import { useState } from "react";
import { crearUsuario } from "../api/apiClient";
import { Eye, EyeOff } from "lucide-react";
import useApi from "../hooks/useApi";


export default function CrearUsuarioModal({ open, onClose, onCreated }) {
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

  const { callApi, loading } = useApi(); // 👈 hook API

  // 🔹 Validaciones
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

    if (!/^\d{10}$/.test(form.telefono))
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

    // 🔒 Restringir cédula y teléfono solo a números
    if ((name === "cedula" || name === "telefono") && !/^\d*$/.test(value)) {
      return;
    }

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
      onClose();
    } catch (err) {
      // El toast de error ya se muestra automáticamente 🚨
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-6">
        <h2 className="text-xl font-semibold mb-4">Crear nuevo usuario</h2>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Columna 1 */}
          <div className="space-y-4">
            {/* Cédula */}
            <div>
              <label className="block text-sm font-medium">Cédula</label>
              <input
                type="text"
                name="cedula"
                value={form.cedula}
                onChange={handleChange}
                maxLength="10"
                required
                className="mt-1 block w-full border rounded-md p-2"
              />
              {errors.cedula && (
                <p className="text-red-500 text-sm">{errors.cedula}</p>
              )}
            </div>

            {/* Nombres */}
            <div>
              <label className="block text-sm font-medium">Nombres</label>
              <input
                type="text"
                name="nombres"
                value={form.nombres}
                onChange={handleChange}
                required
                className="mt-1 block w-full border rounded-md p-2"
              />
              {errors.nombres && (
                <p className="text-red-500 text-sm">{errors.nombres}</p>
              )}
            </div>

            {/* Apellidos */}
            <div>
              <label className="block text-sm font-medium">Apellidos</label>
              <input
                type="text"
                name="apellidos"
                value={form.apellidos}
                onChange={handleChange}
                required
                className="mt-1 block w-full border rounded-md p-2"
              />
              {errors.apellidos && (
                <p className="text-red-500 text-sm">{errors.apellidos}</p>
              )}
            </div>

            {/* Rol */}
            <div>
              <label className="block text-sm font-medium">Rol</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                required
                className="mt-1 block w-full border rounded-md p-2"
              >
                <option value="Propietario">Propietario</option>
                <option value="Tecnico">Técnico</option>
                <option value="Trabajador">Trabajador</option>
              </select>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="mt-1 block w-full border rounded-md p-2"
              />
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Columna 2 */}
          <div className="space-y-4">
            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium">Teléfono</label>
              <input
                type="text"
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                maxLength="10"
                className="mt-1 block w-full border rounded-md p-2"
              />
              {errors.telefono && (
                <p className="text-red-500 text-sm">{errors.telefono}</p>
              )}
            </div>

            {/* Fecha ingreso */}
            <div>
              <label className="block text-sm font-medium">Fecha de ingreso</label>
              <input
                type="date"
                name="fecha_ingreso"
                value={form.fecha_ingreso}
                onChange={handleChange}
                required
                className="mt-1 block w-full border rounded-md p-2"
              />
            </div>

            {/* Dirección */}
            <div>
              <label className="block text-sm font-medium">Dirección</label>
              <textarea
                name="direccion"
                value={form.direccion}
                onChange={handleChange}
                className="mt-1 block w-full border rounded-md p-2"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-medium">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full border rounded-md p-2 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm">{errors.password}</p>
              )}
            </div>

            {/* Confirmar Contraseña */}
            <div>
              <label className="block text-sm font-medium">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full border rounded-md p-2 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="col-span-2 flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Creando..." : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
