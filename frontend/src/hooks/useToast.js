import useToastStore from "../store/toastStore";

export default function useToast() {
  const push = useToastStore((s) => s.push);
  const remove = useToastStore((s) => s.remove);

  // ✅ API "nueva" que ya usas
  const success = (message, opts = {}) =>
    push({ type: "success", title: "Éxito", message, ...opts });

  const info = (message, opts = {}) =>
    push({ type: "info", title: "Info", message, ...opts });

  const warning = (message, opts = {}) =>
    push({ type: "warning", title: "Atención", message, ...opts });

  const error = (message, opts = {}) =>
    push({ type: "danger", title: "Error", message, ...opts });

  // ✅ API "compat" para useApi (SIN cambiar useApi)
  const showSuccess = (msg, opts = {}) => success(msg, opts);

  const showError = (err, opts = {}) => {
    // Acepta string o error de axios
    const msg =
      typeof err === "string"
        ? err
        : err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Error inesperado";
    error(msg, opts);
  };

  return {
    // lo que ya usas
    success,
    info,
    warning,
    error,
    custom: (toast) => push(toast),
    close: (id) => remove(id),

    // lo que useApi necesita
    showSuccess,
    showError,
  };
}
