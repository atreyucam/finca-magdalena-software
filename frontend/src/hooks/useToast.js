import toast from "react-hot-toast";

/**
 * Hook reutilizable para mostrar notificaciones.
 * Ejemplo:
 *   const { showError, showSuccess } = useToast();
 *   showSuccess("Guardado correctamente");
 *   showError(error);
 */
export default function useToast() {
  // ✅ Éxito
  const showSuccess = (message = "Operación exitosa") => {
    toast.success(message, {
      duration: 4000,
      position: "top-right",
    });
  };

  // ❌ Error
  const showError = (error, fallback = "Ocurrió un error inesperado") => {
    let msg = fallback;

    // Manejo flexible: Axios, fetch, string, objeto
    if (typeof error === "string") {
      msg = error;
    } else if (error?.response?.data?.message) {
      msg = error.response.data.message;
    } else if (error?.response?.data?.error) {
      msg = error.response.data.error;
    } else if (error?.message) {
      msg = error.message;
    }

    toast.error(msg, {
      duration: 5000,
      position: "top-right",
    });
  };

  return { showSuccess, showError };
}
