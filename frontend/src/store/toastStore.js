import { create } from "zustand";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const DEFAULT_DURATION = 3000;

const useToastStore = create((set, get) => ({
  toasts: [],

  push: (toast) => {
    const id = toast.id ?? uid();
    const duration = toast.duration ?? DEFAULT_DURATION;

    set((s) => ({
      toasts: [
        ...s.toasts,
        { id, type: "info", title: "", message: "", duration, ...toast },
      ],
    }));

    if (duration > 0) {
      window.setTimeout(() => {
        get().remove(id);
      }, duration);
    }

    return id;
  },

  remove: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  clear: () => set({ toasts: [] }),
}));

export default useToastStore;
