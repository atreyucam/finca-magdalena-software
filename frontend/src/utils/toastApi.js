import useToastStore from "../store/toastStore";

export const toastApi = {
  success: (message, opts = {}) =>
    useToastStore.getState().push({ type: "success", title: "Éxito", message, ...opts }),

  info: (message, opts = {}) =>
    useToastStore.getState().push({ type: "info", title: "Info", message, ...opts }),

  warning: (message, opts = {}) =>
    useToastStore.getState().push({ type: "warning", title: "Atención", message, ...opts }),

  error: (message, opts = {}) =>
    useToastStore.getState().push({ type: "danger", title: "Error", message, ...opts }),

  close: (id) => useToastStore.getState().remove(id),
};
