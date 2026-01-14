// src/api/apiClient.js
import axios from "axios";
import useAuthStore from "../store/authStore";

// ==========================
// 🔹 Cliente principal
// ==========================
// const api = axios.create({
//   baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3001",
//   withCredentials: false,
// });
const api = axios.create({
  baseURL: import.meta.env.PROD ? "/api" : (import.meta.env.VITE_API_BASE_URL || "http://localhost:3001"),
  withCredentials: false,
});


// ==========================
// 🔹 Interceptor Authorization
// ==========================
api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// ==========================
// 🔹 Cola de reintentos (refresh token)
// ==========================
let isRefreshing = false;
let pendingQueue = [];

function processQueue(error, token = null) {
  pendingQueue.forEach(({ resolve, reject, config }) => {
    if (error) reject(error);
    else {
      if (token) config.headers.Authorization = `Bearer ${token}`;
      resolve(api(config));
    }
  });
  pendingQueue = [];
}

// ==========================
// 🔹 Interceptor de respuesta
// ==========================
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    // 🔴 ERROR DE RED PURO (backend caído, sin respuesta)
    if (!error.response) {
      console.error("[API NETWORK ERROR]", {
        message: error.message,
        url: error.config?.url,
      });
      return Promise.reject(error);
    }

    const originalRequest = error.config;



    // ✅ Si el backend dice que el usuario está INACTIVO/BLOQUEADO => logout inmediato (sin refresh)
    if (error.response?.status === 401) {
      const code = error.response?.data?.code;
      if (code === "USER_INACTIVE") {
        useAuthStore.getState().logout({
    silent: false,
    message: "Tu usuario fue desactivado. Se cerró tu sesión.",
  });
        return Promise.reject(error);
      }
    }

    
      if (error.response?.status === 401 && originalRequest?.url?.includes("/auth/login")) {
  return Promise.reject(error);
}
    // ✅ Manejo 401 con refresh (una sola vez)
    if (error.response?.status === 401 && !originalRequest._retry) {
      const { refresh, logout } = useAuthStore.getState();

      // Si falló el refresh => logout
      if (originalRequest.url?.includes("/auth/refresh")) {
  useAuthStore.getState().logout({
    silent: false,
    message: "Tu sesión expiró. Inicia sesión nuevamente.",
  });
  return Promise.reject(error);
}


      // Si ya estamos refrescando, encolamos la request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newAccess = await refresh(); // debe retornar accessToken
        isRefreshing = false;
        processQueue(null, newAccess);

        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshErr) {
        isRefreshing = false;
        processQueue(refreshErr, null);
        logout();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

//
// ==========================
// 🔹 ENDPOINTS (ORDENADO)
// ==========================
//

// ================= AUTH =================
export const login = (data) => api.post("/auth/login", data);
export const refreshToken = () => api.post("/auth/refresh");
export const logoutApi = () => api.post("/auth/logout");



// ================= USUARIOS =================
export const listarUsuarios = (params = {}) => api.get("/usuarios", { params });
export const obtenerUsuario = (id) => api.get(`/usuarios/${id}`);
export const crearUsuario = (data) => api.post("/usuarios", data);
export const editarUsuario = (id, data) => api.patch(`/usuarios/${id}`, data);
export const desactivarUsuario = (id) => api.patch(`/usuarios/${id}/desactivar`);

export const obtenerPagosUsuario = (id) => api.get(`/usuarios/${id}/pagos`);

// ✅ NUEVO: perfil propio
export const obtenerMiUsuario = () => api.get("/usuarios/me");
export const obtenerMisPagos = () => api.get("/usuarios/me/pagos"); // o /pagos/mios
export const obtenerMisTareas = () => api.get("/usuarios/me/tareas");
// ✅ Historial por semanas ISO (usuario logueado)
export const listarMisTareasPorSemana = async () => {
  return api.get("/usuarios/me/tareas-semanas");
};

// ✅ Historial por semanas ISO (admin: propietario/tecnico)
export const listarTareasUsuarioPorSemana = async (id) => {
  return api.get(`/usuarios/${id}/tareas-semanas`);
};


// ✅ Si existe en tu backend con auth:
export const obtenerEstadisticas = (params = {}) =>
  api.get("/usuarios/estadisticas", { params });

// ================= PAGOS =================
export const consolidarSemana = (data) => api.post("/pagos/semana", data);
export const obtenerSemana = (params = {}) => api.get("/pagos/semana", { params });

export const editarDetallePago = (nominaId, detalleId, data) =>
  api.patch(`/pagos/semana/${nominaId}/detalles/${detalleId}`, data);

// ✅ bulk update (Guardar borrador - camino B)
export const bulkUpdateDetallesPago = (nominaId, data) =>
  api.patch(`/pagos/semana/${nominaId}/detalles`, data);

// ✅ excluir/incluir (toggle)
export const toggleExcluirDetallePago = (nominaId, detalleId, data = {}) =>
  api.patch(`/pagos/semana/${nominaId}/detalles/${detalleId}/excluir`, data);

export const aprobarSemana = (nominaId) => api.post(`/pagos/semana/${nominaId}/aprobar`);
export const descargarRecibo = (detalleId, { download = true } = {}) =>
  api.get(`/pagos/recibos/${detalleId}`, {
    params: { download: String(download) },
    responseType: "blob",
  });

export const listarSemanasBorrador = () => api.get("/pagos/semanas/borrador");
export const eliminarSemana = (nominaId) => api.delete(`/pagos/semana/${nominaId}`);
export const misRecibos = () => api.get("/pagos/mios");

// ✅ modal tareas agrupadas por día
export const obtenerTareasDetallePago = (nominaId, detalleId) =>
  api.get(`/pagos/semana/${nominaId}/detalles/${detalleId}/tareas`);

// ✅ historial
export const historialPagos = (params = {}) => api.get("/pagos/historial", { params });

// ================= FINCAS / LOTES / COSECHAS / PERIODOS =================
export const listarFincas = (params = {}) => api.get("/fincas", { params });
export const crearFinca = (data) => api.post("/fincas", data);
export const editarFinca = (id, data) => api.patch(`/fincas/${id}`, data);
export const obtenerContextoFinca = (id) => api.get(`/fincas/${id}/contexto`);
export const cambiarEstadoFinca = (id, data) => api.patch(`/fincas/${id}/estado`, data);

export const listarLotes = (params = {}) => api.get("/lotes", { params });
export const crearLote = (payload) => api.post("/lotes", payload);
export const editarLote = (id, payload) => api.patch(`/lotes/${id}`, payload);
export const toggleEstadoLote = (id) => api.patch(`/lotes/${id}/estado`);
export const obtenerLote = (id, params = {}) => api.get(`/lotes/${id}`, { params });

export const listarCosechas = (params = {}) => api.get("/cosechas", { params });
export const crearCosecha = (payload) => api.post("/cosechas", payload);
export const obtenerCosecha = (id) => api.get(`/cosechas/${id}`);
export const cerrarCosecha = (id, payload) => api.patch(`/cosechas/${id}/cerrar`, payload);

// ✅ preview siguiente cosecha
export const previewSiguienteCosecha = (params = {}) => api.get("/cosechas/next", { params });

// ✅ listar cosechas por finca
export const listarCosechasPorFinca = (fincaId) => api.get("/cosechas", { params: { finca_id: fincaId } });

// ✅ gestión de periodos
export const crearPeriodosCosecha = (cosechaId, periodos) =>
  api.post(`/cosechas/${cosechaId}/periodos`, periodos); // espera array

export const actualizarPeriodoCosecha = (periodoId, data) =>
  api.patch(`/cosechas/periodos/${periodoId}`, data);

export const eliminarPeriodoCosecha = (periodoId) =>
  api.delete(`/cosechas/periodos/${periodoId}`);

// ================= TIPOS ACTIVIDAD / UNIDADES =================
export const listarTiposActividad = (params = {}) => api.get("/tipos-actividad", { params });
export const listarUnidades = (params = {}) => api.get("/unidades", { params });

// ================= TAREAS =================
export const resumenTareas = (params = {}) => api.get("/tareas/resumen", { params });
export const listarTareas = (params = {}) => api.get("/tareas", { params });
export const obtenerTarea = (id) => api.get(`/tareas/${id}`);
export const crearTarea = (data) => api.post("/tareas", data);

// ✅ ASIGNACIONES (OFICIAL): usar SOLO PATCH en todo el frontend
export const actualizarAsignaciones = (id, body) =>
  api.patch(`/tareas/${id}/asignaciones`, body);

// --- flujo estados
export const iniciarTarea = (id, body) => api.post(`/tareas/${id}/iniciar`, body);
export const completarTarea = (id, data) => api.post(`/tareas/${id}/completar`, data);
export const verificarTarea = (id, data) => api.post(`/tareas/${id}/verificar`, data);
export const cancelarTarea = (id, data) => api.post(`/tareas/${id}/cancelar`, data);

// --- detalles (correcciones)
export const actualizarDetalles = (tareaId, payload) =>
  api.patch(`/tareas/${tareaId}/detalles`, payload);

// Alias opcional (si aún lo llamas así en algún lado)
export const corregirTarea = (tareaId, payload) =>
  api.patch(`/tareas/${tareaId}/detalles`, payload);

// --- items / recursos
export const listarTareaItems = (tareaId) => api.get(`/tareas/${tareaId}/items`);
export const configurarTareaItems = (tareaId, data) => api.post(`/tareas/${tareaId}/items`, data);

// --- novedades
export const listarNovedadesTarea = (id) => api.get(`/tareas/${id}/novedades`);
export const crearNovedadTarea = (id, data) => api.post(`/tareas/${id}/novedades`, data);




// ================= INVENTARIO =================
export const getResumenInventario = (params = {}) => api.get("/inventario/resumen", { params });

// Listar ítems (insumos/herramientas/equipos)
export const listarItemsInventario = (params = {}) => api.get("/inventario/items", { params });

// Crear/editar ítem
export const crearItemInventario = (data) => api.post("/inventario/items", data);
export const editarItemInventario = (id, data) => api.patch(`/inventario/items/${id}`, data);
export const editarLoteInventario = (loteId, data) => api.patch(`/inventario/lotes/${loteId}`, data);

// Ajustar stock (entrada/salida)
export const ajustarStock = (id, data) => api.post(`/inventario/items/${id}/ajustes`, data);

// Movimientos
export const listarMovimientosInventario = (params = {}) => api.get("/inventario/movimientos", { params });

// Alertas
export const alertasStockBajo = (params = {}) => api.get("/inventario/alertas/stock-bajo", { params });

// Herramientas - préstamos
export const prestarHerramienta = (id, data) => api.post(`/inventario/herramientas/${id}/prestar`, data);
export const devolverHerramienta = (id, data) => api.post(`/inventario/herramientas/${id}/devolver`, data);
export const listarHerramientasNoDevueltas = () => api.get("/inventario/herramientas/no-devueltas");

export const buscarLoteInventario = (itemId, params = {}) =>
  api.get(`/inventario/items/${itemId}/lotes/buscar`, { params });


// ================= REPORTES =================


// Reportes - Filtros
export const listarFincasReporte = async () => (await api.get("/reportes/filtros/fincas")).data;
export const listarCosechasReporte = async (finca_id) => (await api.get("/reportes/filtros/cosechas", { params: { finca_id } })).data;
export const listarLotesReporte = async (finca_id) => (await api.get("/reportes/filtros/lotes", { params: { finca_id } })).data;

// Reporte de tareas
export const reporteTareas = async (params) => (await api.get("/reportes/tareas", { params })).data;


// ✅ Reportes - Inventario (4 secciones)
export const reporteInventarioResumen = async (params) =>
  (await api.get("/reportes/inventario/resumen", { params })).data;

export const reporteInventarioStock = async (params) =>
  (await api.get("/reportes/inventario/stock", { params })).data;

export const reporteInventarioFefo = async (params) =>
  (await api.get("/reportes/inventario/fefo", { params })).data;

export const reporteInventarioPrestamos = async (params) =>
  (await api.get("/reportes/inventario/prestamos", { params })).data;


// ✅ Reporte Mano de Obra (Pagos)
export const reporteManoObraResumen = async (params) =>
  (await api.get("/reportes/mano-obra/resumen", { params })).data;

export const reporteManoObraDetalle = async (params) =>
  (await api.get("/reportes/mano-obra/detalle", { params })).data;


// ✅ Reportes - Producción / Cosecha (6 secciones)
export const reporteProduccionResumen = async (params) =>
  (await api.get("/reportes/produccion/resumen", { params })).data;

export const reporteProduccionPorLote = async (params) =>
  (await api.get("/reportes/produccion/por-lote", { params })).data;

export const reporteProduccionClasificacion = async (params) =>
  (await api.get("/reportes/produccion/clasificacion", { params })).data;

export const reporteProduccionMerma = async (params) =>
  (await api.get("/reportes/produccion/merma", { params })).data;

export const reporteProduccionLogistica = async (params) =>
  (await api.get("/reportes/produccion/logistica", { params })).data;

export const reporteProduccionEventos = async (params) =>
  (await api.get("/reportes/produccion/eventos", { params })).data;

// Producción - comparar
export const compararProduccionFincas = (params) =>
  api.get("/reportes/produccion/comparar/fincas", { params });

export const compararProduccionCosechas = (params) =>
  api.get("/reportes/produccion/comparar/cosechas", { params });

export const compararProduccionLotes = (params) =>
  api.get("/reportes/produccion/comparar/lotes", { params });

export const reporteDashboard = async (params) =>
  (await api.get("/reportes/dashboard", { params })).data;


// ================= NOTIFICACIONES =================
export const listarNotificaciones = (params = {}) => api.get("/notificaciones", { params });
export const marcarNotificacionLeida = (id) => api.patch(`/notificaciones/${id}/leida`);
export const marcarTodasNotificacionesLeidas = () => api.post("/notificaciones/leidas");

export default api;
