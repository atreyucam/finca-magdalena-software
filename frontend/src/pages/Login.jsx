// src/pages/Login.jsx
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";
import useAuthStore from "../store/authStore";
import heroImg from "../assets/pitahaya.png";
import logoFM from "../assets/Logo-FM.png";
import { clsx } from "clsx";

const schema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const [show, setShow] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });

  const onSubmit = async (values) => {
    try {
      const user = await login(values.email, values.password);
      const role = (user?.role || user?.rol || "").toLowerCase();
      const from = location.state?.from?.pathname;
      if (from) return navigate(from, { replace: true });

      if (role === "propietario") navigate("/owner/dashboard", { replace: true });
      else if (role === "tecnico") navigate("/tech/dashboard", { replace: true });
      else if (role === "trabajador") navigate("/worker/mis-tareas", { replace: true });
      else navigate("/", { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.response?.data?.error || "Credenciales inválidas";
      toast.error(msg);
    }
  };

  return (
    <main className="min-h-dvh bg-slate-50">
      <section className="mx-auto grid min-h-dvh max-w-7xl grid-cols-1 lg:grid-cols-2">
        {/* ===== IZQUIERDA ===== */}
        <div className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div className="w-full max-w-[440px]">
            {/* Logo centrado en móvil */}
            <div className="mb-6 flex justify-center lg:justify-start">
              <img
                src={logoFM}
                alt="Logo Finca La Magdalena"
                className="h-12 w-12 rounded-md object-contain"
              />
            </div>

            {/* Título y descripción centrados en móvil */}
            <div className="text-center lg:text-left">
              <h1 className="text-[28px] font-semibold leading-8 text-slate-900">
                ¡Bienvenido de nuevo!
              </h1>
              <p className="mt-1 text-[13px] leading-5 text-slate-500">
                Ingresa tus credenciales para iniciar sesión.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="admin@finca.test"
                  className="block w-full rounded-xl bg-slate-100 px-4 h-11 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:bg-white focus:ring-2 focus:ring-slate-900/10"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Contraseña */}
              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="block w-full rounded-xl bg-slate-100 px-4 pr-11 h-11 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:bg-white focus:ring-2 focus:ring-slate-900/10"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute inset-y-0 right-0 mr-2 inline-flex items-center rounded-lg px-2 text-slate-500 hover:bg-slate-100"
                    aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                    tabIndex={-1}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {show ? (
                        <>
                          <path d="M3 3l18 18" />
                          <path d="M10.6 10.6A3 3 0 0012 15a3 3 0 002.4-4.4M6.3 6.3A15.9 15.9 0 003 12s3 7 9 7a9.7 9.7 0 003.1-.5M17.8 17.8A15.9 15.9 0 0021 12s-3-7-9-7a9.7 9.7 0 00-2.1.2" />
                        </>
                      ) : (
                        <>
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>

              {/* Recuperar
              <div className="pt-1 text-center lg:text-left">
                <Link
                  to="/recuperar"
                  className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div> */}

              {/* Botón */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#2563eb] px-4 text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#1e55c7] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Ingresando…" : "Iniciar sesión"}
              </button>

              {/* Línea divisoria */}
              <div className="my-4 h-px w-full bg-slate-200" />
             <div
                         className={clsx(
                           "pt-3 text-xs text-slate-500 px-1 text-center",
                           "transition-[opacity,transform,max-height] duration-200 ease-in-out overflow-hidden",
                           open ? "opacity-100 translate-y-0 max-h-10" : "opacity-0 -translate-y-1 max-h-0"
                          )}
                          >
                         © {new Date().getFullYear()} Finca La Magdalena
                       </div>
            </form>
          </div>
        </div>

        {/* ===== DERECHA ===== */}
        <div className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-6 rounded-[28px] " />
          <img
            src={heroImg}
            alt="Ilustración pitahaya"
            className="relative z-10 m-auto h-full w-full max-w-3xl object-contain p-12"
          />
        </div>
      </section>
    </main>
  );
}
