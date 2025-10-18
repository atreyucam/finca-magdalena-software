// Topbar.jsx
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PiBellRingingBold } from "react-icons/pi";
import { HiMenu, HiMenuAlt2 } from "react-icons/hi"; // ⬅️ nuevos íconos
import useAuthStore from "../store/authStore";
import logoFM from "../assets/Logo-FM.png";

export default function Topbar({ onToggleSidebar, isSidebarOpen = false }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const role = (user?.role || user?.rol || "").toLowerCase();
  const homeByRole =
    role === "propietario" ? "/owner/dashboard"
    : role === "tecnico"   ? "/tech/dashboard"
    : role === "trabajador"? "/worker/mis-tareas"
    : "/";

  const initials = (user?.nombres || user?.name || "U")
    .split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-slate-300/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-14 max-w-full items-center justify-between px-3 sm:px-4">
        {/* IZQUIERDA: logo + (nombre si sidebar abierto) + divisor + botón */}
        <div className="flex items-center gap-3">
          <Link to={homeByRole} className="flex items-center gap-2" aria-label="Ir al dashboard">
            <img src={logoFM} alt="Finca La Magdalena" className="h-8 w-8 rounded-[6px] object-contain" />
            {isSidebarOpen && (
              <span className="hidden lg:inline text-[15px] font-semibold text-slate-800">
                Finca La Magdalena
              </span>
            )}
          </Link>

          {/* divisor fino antes del botón */}
          <span className="hidden lg:inline-block h-6 w-px bg-slate-300/80" />

          {/* Botón mostrar/ocultar (mismo botón para móvil y desktop) */}
          <button
            onClick={onToggleSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg
                       hover:bg-slate-100 active:bg-slate-200 focus:outline-none focus:ring-0"
            aria-label={isSidebarOpen ? "Ocultar barra lateral" : "Mostrar barra lateral"}
            title={isSidebarOpen ? "Ocultar menú" : "Mostrar menú"}
          >
            {isSidebarOpen ? (
              <HiMenuAlt2 className="h-5 w-5 text-slate-700" />
            ) : (
              <HiMenu className="h-5 w-5 text-slate-700" />
            )}
          </button>
        </div>

        {/* DERECHA: campana + avatar */}
        <div className="flex items-center gap-1 sm:gap-2 ml-auto">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((p) => !p)}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
              aria-haspopup="true"
              aria-expanded={notifOpen}
              aria-label="Notificaciones"
            >
              <PiBellRingingBold className="h-5 w-5" />
              <span className="absolute right-1 top-1 inline-block h-2 w-2 rounded-full bg-rose-500" />
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg" role="dialog" aria-label="Panel de notificaciones">
                <h3 className="px-2 pb-2 text-base font-semibold text-slate-800">Notificaciones</h3>
                {/* … items de notificación … */}
              </div>
            )}
          </div>

          <AvatarMenu
            user={user}
            logout={logout}
            navigate={navigate}
            profileOpen={profileOpen}
            setProfileOpen={setProfileOpen}
            profileRef={profileRef}
            initials={initials}
          />
        </div>
      </div>
    </header>
  );
}

function AvatarMenu({ user, logout, navigate, profileOpen, setProfileOpen, profileRef, initials }) {
  return (
    <div className="relative" ref={profileRef}>
      <button
        onClick={() => setProfileOpen((p) => !p)}
        className="inline-flex items-center rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-slate-300"
        aria-haspopup="true"
        aria-expanded={profileOpen}
      >
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-[13px] font-semibold text-slate-700">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            (user?.nombres || user?.name ? initials : "U")
          )}
        </div>
      </button>

      {profileOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg" role="menu">
          <button
            onClick={() => { setProfileOpen(false); navigate(`/owner/perfil`); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 12a5 5 0 100-10 5 5 0 000 10z" />
              <path d="M20 21a8 8 0 10-16 0" />
            </svg>
            Perfil
          </button>

          <button
            onClick={logout}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 12H3" />
              <path d="M10 7l-5 5 5 5" />
              <path d="M21 3h-6a2 2 0 00-2 2v2" />
              <path d="M21 21h-6a2 2 0 01-2-2v-2" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
