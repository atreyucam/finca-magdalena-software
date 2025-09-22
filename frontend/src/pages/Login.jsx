import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import useAuthStore from "../store/authStore";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const onSubmit = async (values) => {
    try {
      const user = await login(values.email, values.password);

      // Redirección por rol
      const role = (user?.role || user?.rol || "").toLowerCase();
      const from = location.state?.from?.pathname;

      if (from) return navigate(from, { replace: true });

      if (role === "propietario") {
   navigate("/owner/dashboard", { replace: true });
 } else if (role === "tecnico") {
   navigate("/tech/dashboard", { replace: true });
 } else if (role === "trabajador") {
   navigate("/worker/mis-tareas", { replace: true });
 } else {
   navigate("/login", { replace: true });
 }
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.response?.data?.error || "Credenciales inválidas";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen grid place-content-center">
      <div className="w-[380px] rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-1">
          {import.meta.env.VITE_APP_NAME || "App"} — Login
        </h1>
        <p className="text-sm text-gray-600 mb-6">Ingresa tus credenciales</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-md border px-3 py-2"
              placeholder="admin@finca.test"
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm mb-1">Contraseña</label>
            <input
              type="password"
              className="w-full rounded-md border px-3 py-2"
              placeholder="••••••••"
              {...register("password")}
            />
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
          </div>

          <button
            disabled={isSubmitting}
            className="w-full rounded-md bg-gray-900 text-white py-2.5 hover:bg-black disabled:opacity-50"
          >
            {isSubmitting ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
