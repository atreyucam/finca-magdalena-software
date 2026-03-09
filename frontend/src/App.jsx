import { BrowserRouter } from "react-router-dom";
import { useEffect } from "react";
import AppRouter from "./routes/AppRouter";
import ToastContainer from "./components/ToastContainer";
import AppTitle from "./components/app/AppTitle";
import useSessionActivity from "./hooks/useSessionActivity";
import useAuthStore from "./store/authStore";
import useNotificacionesStore from "./store/notificacionesStore";

export default function App() {
  useSessionActivity();
  const accessToken = useAuthStore((s) => s.accessToken);
  const resetNotificaciones = useNotificacionesStore((s) => s.reset);

  useEffect(() => {
    if (!accessToken) resetNotificaciones();
  }, [accessToken, resetNotificaciones]);

  return (
    <BrowserRouter>
      <AppTitle />
      <ToastContainer />
      <AppRouter />
    </BrowserRouter>
  );
}
