import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import useAuthStore from "../store/authStore";
import logoFM from "../assets/Logo-FM.png";
import heroImg from "../assets/pitahaya.png";

// UI
import Input from "../components/ui/Input";
import Boton from "../components/ui/Boton";

// Validaciones
const schema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" }
  });

  const onSubmit = async (values) => {
    try {
      const user = await login(values.email, values.password);
      const role = (user?.role || user?.rol || "").toLowerCase();
      
      // Redirección inteligente
      const from = location.state?.from?.pathname;
      if (from) return navigate(from, { replace: true });

      const rutas = {
        propietario: "/owner/dashboard",
        tecnico: "/tech/dashboard",
        trabajador: "/worker/mis-tareas"
      };
      
      navigate(rutas[role] || "/", { replace: true });
      
    } catch (err) {
      toast.error(err?.response?.data?.message || "Credenciales incorrectas");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 grid grid-cols-1 lg:grid-cols-2">
      
      {/* LADO IZQUIERDO: FORMULARIO */}
      <div className="flex items-center justify-center p-8 sm:p-12 lg:p-16">
        <div className="w-full max-w-md space-y-8">
          
          <div className="text-center lg:text-left">
            <img src={logoFM} alt="Logo" className="h-16 w-16 mx-auto lg:mx-0 object-contain mb-6" />
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Bienvenido de nuevo</h1>
            <p className="mt-2 text-slate-500">Ingresa tus credenciales para acceder al sistema.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input 
              label="Correo Electrónico"
              type="email" 
              placeholder="usuario@finca.com"
              icono={Mail}
              error={errors.email?.message}
              {...register("email")}
            />

            <div className="relative">
              <Input 
                label="Contraseña"
                type={showPass ? "text" : "password"} 
                placeholder="••••••••"
                icono={Lock}
                error={errors.password?.message}
                {...register("password")}
                contenedorClass="w-full"
              />
              <button 
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <Boton 
              tipo="submit" 
              variante="primario" 
              cargando={isSubmitting} 
              className="w-full !py-3 !text-base shadow-lg shadow-emerald-500/20"
              icono={LogIn}
            >
              Iniciar Sesión
            </Boton>
          </form>

          <p className="text-center text-xs text-slate-400 mt-8">
            © {new Date().getFullYear()} Sistema de Gestión Agrícola<br />Finca La Magdalena
          </p>
        </div>
      </div>

      {/* LADO DERECHO: IMAGEN */}
      <div className="hidden lg:block relative bg-emerald-900 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/80 to-slate-900/80 z-10"></div>
        <img 
          src={heroImg} 
          alt="Campo de Pitahaya" 
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60"
        />
        <div className="relative z-20 h-full flex flex-col justify-end p-16 text-white">
          <h2 className="text-4xl font-bold mb-4">Gestión Eficiente para tu Cultivo</h2>
          <p className="text-emerald-100 text-lg max-w-lg">Controla producción, inventario y personal en un solo lugar. Optimiza recursos y toma mejores decisiones.</p>
        </div>
      </div>

    </main>
  );
}