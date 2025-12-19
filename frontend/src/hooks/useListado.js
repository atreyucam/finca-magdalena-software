import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner"; // O tu librería de toast preferida

/**
 * Hook para manejar la lógica de carga, filtrado y paginación de cualquier tabla.
 * @param {Function} apiFunction - Función async que llama al API (ej: listarUsuarios)
 * @param {Object} estadoInicialFiltros - Objeto con filtros iniciales
 */
export default function useListado(apiFunction, estadoInicialFiltros = {}) {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  
  // Paginación
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);

  // Filtros
  const [filtros, setFiltros] = useState(estadoInicialFiltros);

  // Función de carga memoizada para poder llamarla manualmente (recargar)
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      // Preparamos params mezclando paginación y filtros
      const params = {
        page: pagina,
        pageSize: 20, // O pasarlo como config
        ...filtros,
      };

      const respuesta = await apiFunction(params);
      
      // Adaptador flexible según cómo venga tu API
      const lista = respuesta.data?.data || respuesta.data || [];
      const meta = respuesta.data; // Asumiendo que meta data viene en la raíz o data

      setDatos(lista);
      setTotalPaginas(meta?.totalPages || 1);
      setTotalRegistros(meta?.totalItems || meta?.count || lista.length);

    } catch (err) {
      console.error("Error en useListado:", err);
      const msg = err?.response?.data?.message || "Error al cargar datos.";
      setError(msg);
      toast.error(msg);
    } finally {
      setCargando(false);
    }
  }, [apiFunction, pagina, filtros]);

  // Efecto principal: Cargar cuando cambia página o filtros
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Helpers para filtros
  const actualizarFiltro = (nombre, valor) => {
    setFiltros((prev) => ({ ...prev, [nombre]: valor }));
    setPagina(1); // Resetear a página 1 al filtrar
  };

  const limpiarFiltros = () => {
    setFiltros(estadoInicialFiltros);
    setPagina(1);
  };

  return {
    datos,
    cargando,
    error,
    pagina,
    setPagina,
    totalPaginas,
    totalRegistros,
    filtros,
    actualizarFiltro,
    limpiarFiltros,
    recargar: cargarDatos,
  };
}