import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PiListBold, PiXBold } from "react-icons/pi";
import useAuthStore from "../store/authStore";
import Avatar from "./Avatar";
import NotificationsBell from "./NotificationsBell";
import useNotificacionesStore from "../store/notificacionesStore";


// --- SUB-COMPONENTE: Menú de Usuario ---
function MenuUsuario({ user, logout, onIrPerfil }) {
  const [abierto, setAbierto] = useState(false);   // 👈 FALTABA
  const ref = useRef(null);
  const initializedNotifs = useNotificacionesStore((s) => s.initialized);
  const cargarNotifs = useNotificacionesStore((s) => s.cargar);

   useEffect(() => {
    // ✅ cargar 1 sola vez al montar la barra
    if (!initializedNotifs) cargarNotifs();
  }, [initializedNotifs, cargarNotifs]);
  // Cerrar al hacer clic fuera
  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAbierto(!abierto)}
        className="flex items-center gap-2 rounded-full p-1 hover:bg-slate-100 transition-colors focus:ring-2 focus:ring-emerald-500/20"
      >
        <Avatar user={user} size={34} className="border border-slate-200" />
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl bg-white shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {user?.nombres} {user?.apellidos}
            </p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>

          <div className="p-1">
            <button
              onClick={() => {
                setAbierto(false);
                onIrPerfil();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              👤 Mi Perfil
            </button>
            <button
              onClick={() => {
                setAbierto(false);
                logout();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
            >
              🚪 Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
export default function BarraSuperior({
  alAlternarMenuLateral,
  menuLateralAbierto,
}) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // Determinar ruta de perfil según rol
  const irAlPerfil = () => {
    const rol = (user?.role || "").toLowerCase();
    const id = user?.id;
    if (!id) return;

    if (rol === "propietario") navigate(`/owner/usuarios/${id}`);
    else if (rol === "tecnico") navigate(`/tech/mi-perfil`);
    else if (rol === "trabajador") navigate(`/worker/mi-perfil`);
    else navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 h-16 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 supports-[backdrop-filter]:bg-white/60">
      <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Izquierda: Toggle Sidebar */}
        <div className="flex items-center">
          <button
            onClick={alAlternarMenuLateral}
            className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            title={menuLateralAbierto ? "Cerrar menú" : "Abrir menú"}
          >
            {menuLateralAbierto ? (
              <PiXBold size={20} />
            ) : (
              <PiListBold size={24} />
            )}
          </button>
        </div>

        {/* Derecha: Acciones */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Notificaciones con panel lateral */}
          <NotificationsBell />

          {/* Divisor vertical */}
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* Menú Usuario */}
          <MenuUsuario user={user} logout={logout} onIrPerfil={irAlPerfil} />
        </div>
      </div>
    </header>
  );
}
