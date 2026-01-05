import useToastStore from "../store/toastStore";

export default function useToast() {
  const push = useToastStore((s) => s.push);
  const remove = useToastStore((s) => s.remove);

  return {
    success: (message, opts = {}) =>
      push({ type: "success", title: "Éxito", message, ...opts }),
    info: (message, opts = {}) =>
      push({ type: "info", title: "Info", message, ...opts }),
    warning: (message, opts = {}) =>
      push({ type: "warning", title: "Atención", message, ...opts }),
    error: (message, opts = {}) =>
      push({ type: "danger", title: "Error", message, ...opts }),
    custom: (toast) => push(toast),
    close: (id) => remove(id),
  };
}


// import useToast from "../hooks/useToast";

// const toast = useToast();

// toast.success("Lote creado correctamente");
// toast.error("No se pudo guardar el inventario");
// toast.warning("Faltan campos por completar");
// toast.info("Sincronizando datos...");
