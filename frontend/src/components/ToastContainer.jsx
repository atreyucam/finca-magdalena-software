import useToastStore from "../store/toastStore";
import { PiCheckCircleFill, PiInfoFill, PiWarningFill, PiXCircleFill, PiXBold } from "react-icons/pi";

const typeStyles = {
  success: {
    ring: "ring-emerald-200",
    bg: "bg-white",
    icon: <PiCheckCircleFill className="text-emerald-600" size={22} />,
  },
  info: {
    ring: "ring-sky-200",
    bg: "bg-white",
    icon: <PiInfoFill className="text-sky-600" size={22} />,
  },
  warning: {
    ring: "ring-amber-200",
    bg: "bg-white",
    icon: <PiWarningFill className="text-amber-600" size={22} />,
  },
  danger: {
    ring: "ring-rose-200",
    bg: "bg-white",
    icon: <PiXCircleFill className="text-rose-600" size={22} />,
  },
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
    <div className="fixed top-8 right-6 z-[9999] w-[360px] max-w-[calc(100vw-2rem)] space-y-3">
      {toasts.map((t) => {
        const st = typeStyles[t.type] ?? typeStyles.info;

        return (
          <div
            key={t.id}
            className={`relative overflow-hidden rounded-2xl ${st.bg} shadow-xl ring-1 ${st.ring} animate-in fade-in slide-in-from-top-2 duration-150`}
          >
            <div className="p-4 pr-12 flex gap-3">
              <div className="mt-0.5">{st.icon}</div>

              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {t.title}
                </div>
                <div className="text-sm text-slate-600 leading-snug break-words">
                  {t.message}
                </div>
              </div>

              <button
                onClick={() => remove(t.id)}
                className="absolute top-3 right-3 h-9 w-9 grid place-items-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition"
                aria-label="Cerrar"
              >
                <PiXBold size={16} />
              </button>
            </div>

            {/* barrita de tiempo (visual) */}
            <div className="h-1 w-full bg-slate-100">
              <div
                className="h-full bg-slate-300"
                style={{
                  width: "100%",
                  animation: `toastbar ${Math.max(200, t.duration ?? 2000)}ms linear forwards`,
                }}
              />
            </div>
          </div>
        );
      })}

      {/* keyframes inline (Tailwind no trae esto por defecto) */}
      <style>{`
        @keyframes toastbar {
          from { transform: translateX(0%); }
          to { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
