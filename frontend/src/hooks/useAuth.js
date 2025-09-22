import { useEffect } from "react";
import useAuthStore from "../store/authStore";
import api from "../api/apiClient";

export default function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isBootstrapped = useAuthStore((s) => s.isBootstrapped);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const setUserFromProfile = useAuthStore((s) => s.setUserFromProfile);

  useEffect(() => {
    bootstrap().then(async () => {
      // Si hay token, cargamos /auth/profile para sincronizar usuario
      try {
        const hasToken = !!useAuthStore.getState().accessToken;
        if (hasToken) {
          const res = await api.get("/auth/profile", { suppressToast: true });
          setUserFromProfile(res.data);
        }
      } catch {
        // si falla, el interceptor se encarga (posible logout)
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, isBootstrapped };
}
