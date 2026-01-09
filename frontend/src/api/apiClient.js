// src/api/apiClient.js
import axios from "axios";
import useAuthStore from "../store/authStore";

// ==========================
// 🔹 Cliente principal
// ==========================
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3001",
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

    const msg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Error de red";

    console.error(
      `[API ERROR] ${originalRequest?.method?.toUpperCase?.()} ${originalRequest?.url} ->`,
      error.response?.status,
      msg,
      error.response?.data
    );

    // ✅ Manejo 401 con refresh (una sola vez)
    if (error.response?.status === 401 && !originalRequest._retry) {
      const { refresh, logout } = useAuthStore.getState();

      // Si falló el refresh => logout
      if (originalRequest.url?.includes("/auth/refresh")) {
        console.warn("Sesión expirada. Inicia sesión nuevamente.");
        logout();
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
export const generarRecibo = (nominaId, detalleId) =>
  api.post(`/pagos/semana/${nominaId}/recibos/${detalleId}`);

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
export const getDashboardIntegral = (params = {}) => api.get("/reportes/dashboard", { params });
export const getReporteRendimiento = (params = {}) => api.get("/reportes/cosecha/rendimiento", { params });
export const getReporteFitosanitario = (params = {}) => api.get("/reportes/fitosanitario", { params });
export const getReporteOperaciones = (params = {}) => api.get("/reportes/operaciones", { params });
export const getReporteCostos = (params = {}) => api.get("/reportes/costos", { params });

// ================= NOTIFICACIONES =================
export const listarNotificaciones = (params = {}) => api.get("/notificaciones", { params });
export const marcarNotificacionLeida = (id) => api.patch(`/notificaciones/${id}/leida`);
export const marcarTodasNotificacionesLeidas = () => api.post("/notificaciones/leidas");

export default api;
