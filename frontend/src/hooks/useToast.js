import { useCallback, useMemo } from "react";
import useToastStore from "../store/toastStore";

export default function useToast() {
  const push = useToastStore((s) => s.push);
  const remove = useToastStore((s) => s.remove);

  // ✅ API "nueva" que ya usas
  const success = useCallback(
    (message, opts = {}) =>
      push({ type: "success", title: "Éxito", message, ...opts }),
    [push]
  );

  const info = useCallback(
    (message, opts = {}) =>
      push({ type: "info", title: "Info", message, ...opts }),
    [push]
  );

  const warning = useCallback(
    (message, opts = {}) =>
      push({ type: "warning", title: "Atención", message, ...opts }),
    [push]
  );

  const error = useCallback(
    (message, opts = {}) =>
      push({ type: "danger", title: "Error", message, ...opts }),
    [push]
  );

  // ✅ API "compat" para useApi (SIN cambiar useApi)
  const showSuccess = useCallback((msg, opts = {}) => success(msg, opts), [success]);

  const showError = useCallback(
    (err, opts = {}) => {
      // Acepta string o error de axios
      const msg =
        typeof err === "string"
          ? err
          : err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            "Error inesperado";
      error(msg, opts);
    },
    [error]
  );

  const custom = useCallback((toast) => push(toast), [push]);
  const close = useCallback((id) => remove(id), [remove]);

  return useMemo(
    () => ({
      // lo que ya usas
      success,
      info,
      warning,
      error,
      custom,
      close,

      // lo que useApi necesita
      showSuccess,
      showError,
    }),
    [success, info, warning, error, custom, close, showSuccess, showError]
  );
}
