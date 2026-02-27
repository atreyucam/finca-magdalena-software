import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner"; // O tu librería de toast preferida

/**
 * Hook para manejar la lógica de carga, filtrado y paginación de cualquier tabla.
 * @param {Function} apiFunction - Función async que llama al API (ej: listarUsuarios)
 * @param {Object} estadoInicialFiltros - Objeto con filtros iniciales
 */
export default function useListado(apiFunction, estadoInicialFiltros = {}) {
  const initialFiltrosRef = useRef(estadoInicialFiltros);
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
    const desiredLimit = Number(filtros?.limit ?? filtros?.pageSize ?? 20);
    const params = {
      page: pagina,
      ...filtros,
      limit: desiredLimit,
    };


    const respuesta = await apiFunction(params);


  const payload = respuesta?.data;

// ✅ Si el backend devuelve array directo: [{...}, {...}]
if (Array.isArray(payload)) {
  setDatos(payload);
  setTotalRegistros(payload.length);
  setTotalPaginas(1);
  setCargando(false);
  return; // 👈 salimos porque ya resolvimos
}

const root =
  payload?.data && !Array.isArray(payload.data) && typeof payload.data === "object"
    ? payload.data
    : payload || {};

// ✅ Caso normal: objeto paginado { data: [], total, page, limit... }
const lista =
  root?.data ??
  root?.rows ??
  root?.items ??
  payload?.data ??
  payload?.rows ??
  payload?.items ??
  [];

const totalItems =
  root?.total ??
  root?.totalItems ??
  root?.count ??
  payload?.total ??
  payload?.totalItems ??
  payload?.count ??
  (Array.isArray(lista) ? lista.length : 0);

const pageSizeResp = root?.limit ?? root?.pageSize ?? payload?.limit ?? payload?.pageSize ?? params.limit;

const totalPages =
  payload?.totalPages ??
  Math.max(1, Math.ceil((totalItems || 0) / (pageSizeResp || 20)));

setDatos(Array.isArray(lista) ? lista : []);
setTotalPaginas(totalPages);
setTotalRegistros(totalItems);

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
  const actualizarFiltro = useCallback((nombre, valor) => {
    setFiltros((prev) => {
      // Evita re-render/loops cuando el filtro no cambió realmente
      if (prev?.[nombre] === valor) return prev;
      return { ...prev, [nombre]: valor };
    });
    setPagina((prev) => (prev === 1 ? prev : 1)); // Resetear a página 1 al filtrar
  }, []);

  const limpiarFiltros = useCallback(() => {
    setFiltros(initialFiltrosRef.current);
    setPagina((prev) => (prev === 1 ? prev : 1));
  }, []);

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
