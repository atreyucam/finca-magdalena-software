import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function LinkVolver({ to, label = "Volver", className = "" }) {
  const navigate = useNavigate();

  const handlePress = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1); // Si no se pasa ruta, vuelve a la página anterior del historial
    }
  };

  return (
    <button 
      onClick={handlePress}
      className={`flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors ${className}`}
    >
      <ArrowLeft size={18} />
      {label}
    </button>
  );
}