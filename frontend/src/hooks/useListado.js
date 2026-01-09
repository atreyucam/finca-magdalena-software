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
    const params = {
  page: pagina,
  ...filtros,
  pageSize: filtros?.pageSize ?? 20,
  limit: filtros?.limit ?? 20,
};


    const respuesta = await apiFunction(params);
    console.log("📥 respuesta listar:", respuesta);
console.log("📥 respuesta.data:", respuesta?.data);


  const payload = respuesta?.data;

// ✅ Si el backend devuelve array directo: [{...}, {...}]
if (Array.isArray(payload)) {
  setDatos(payload);
  setTotalRegistros(payload.length);
  setTotalPaginas(1);
  setCargando(false);
  return; // 👈 salimos porque ya resolvimos
}

// ✅ Caso normal: objeto paginado { data: [], totalItems, totalPages... }
const lista =
  payload?.data ??
  payload?.rows ??
  payload?.items ??
  [];

const totalItems =
  payload?.totalItems ??
  payload?.total ??
  payload?.count ??
  (Array.isArray(lista) ? lista.length : 0);

const pageSizeResp = payload?.pageSize ?? params.pageSize;

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