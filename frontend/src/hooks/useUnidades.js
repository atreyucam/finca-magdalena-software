// src/hooks/useUnidades.js
import { useEffect, useState } from "react";
import { listarUnidades } from "../api/apiClient";

export default function useUnidades() {
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUnidades = async () => {
      try {
        setLoading(true);
        const res = await listarUnidades();
        setUnidades(res.data || []);
      } catch (err) {
        console.error("Error cargando unidades:", err);
        setError("No se pudieron cargar las unidades");
      } finally {
        setLoading(false);
      }
    };

    fetchUnidades();
  }, []);

  return { unidades, loading, error };
}