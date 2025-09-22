import useAuthStore from "../store/authStore";

export default function Topbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="h-14 border-b bg-white flex items-center justify-between px-4">
      <div className="font-semibold">{import.meta.env.VITE_APP_NAME || "App"}</div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{user?.nombres || user?.name || "Usuario"}</span>
        <button
          onClick={logout}
          className="px-3 py-1.5 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
