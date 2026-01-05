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
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ==========================
// 🔹 Cola de reintentos
// ==========================
let isRefreshing = false;
let pendingQueue = [];

function processQueue(error, token = null) {
  pendingQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error);
    } else {
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

    if (error.response?.status === 401 && !originalRequest._retry) {
      const { refresh, logout } = useAuthStore.getState();

      if (originalRequest.url?.includes("/auth/refresh")) {
        console.warn("Sesión expirada. Inicia sesión nuevamente.");
        logout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newAccess = await refresh();
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
// 🔹 ENDPOINTS
// ==========================
//

// --- Auth
export const login = (data) => api.post("/auth/login", data);
export const refreshToken = () => api.post("/auth/refresh");
export const logoutApi = () => api.post("/auth/logout");

// --- Usuarios
export const listarUsuarios = (params) => api.get("/usuarios", { params });
export const obtenerUsuario = (id) => api.get(`/usuarios/${id}`);
export const crearUsuario = (data) => api.post("/usuarios", data);
export const editarUsuario = (id, data) => api.patch(`/usuarios/${id}`, data);
export const desactivarUsuario = (id) =>
  api.patch(`/usuarios/${id}/desactivar`);

export const obtenerPagosUsuario = (id) => {
  return api.get(`/usuarios/${id}/pagos`);
};

// --- Pagos
export const consolidarSemana = (data) => api.post("/pagos/semana", data);

export const obtenerSemana = (params = {}) => api.get("/pagos/semana", { params });

export const editarDetallePago = (nominaId, detalleId, data) =>
  api.patch(`/pagos/semana/${nominaId}/detalles/${detalleId}`, data);

// ✅ NUEVO: bulk update (Guardar borrador - camino B)
export const bulkUpdateDetallesPago = (nominaId, data) =>
  api.patch(`/pagos/semana/${nominaId}/detalles`, data);

// ✅ NUEVO: excluir/incluir (toggle)
export const toggleExcluirDetallePago = (nominaId, detalleId, data = {}) =>
  api.patch(`/pagos/semana/${nominaId}/detalles/${detalleId}/excluir`, data);

export const aprobarSemana = (nominaId) =>
  api.post(`/pagos/semana/${nominaId}/aprobar`);

export const generarRecibo = (nominaId, detalleId) =>
  api.post(`/pagos/semana/${nominaId}/recibos/${detalleId}`);

export const listarSemanasBorrador = () => api.get("/pagos/semanas/borrador");

export const eliminarSemana = (nominaId) => api.delete(`/pagos/semana/${nominaId}`);

export const misRecibos = () => api.get("/pagos/mios");

// ✅ NUEVO: modal tareas agrupadas por día
export const obtenerTareasDetallePago = (nominaId, detalleId) =>
  api.get(`/pagos/semana/${nominaId}/detalles/${detalleId}/tareas`);

// ✅ NUEVO: historial (Tab 2)
export const historialPagos = (params = {}) => api.get("/pagos/historial", { params });

// --- Tareas
export const resumenTareas = () =>
  api.get("/tareas/resumen");
export const listarTareas = (params) => api.get("/tareas", { params });
export const obtenerTarea = (id) => api.get(`/tareas/${id}`);
export const crearTarea = (data) => api.post("/tareas", data);

export const asignarUsuariosTarea = (id, data) =>
  api.post(`/tareas/${id}/asignaciones`, data);

export const actualizarAsignaciones = (id, body) =>
  api.patch(`/tareas/${id}/ActualizarAsignaciones`, body);

export const iniciarTarea = (id, body) => 
  api.post(`/tareas/${id}/iniciar`, body);

export const completarTarea = (id, data) =>
  api.post(`/tareas/${id}/completar`, data);

export const verificarTarea = (id, data) =>
  api.post(`/tareas/${id}/verificar`, data);

export const listarNovedadesTarea = (id) => 
  api.get(`/tareas/${id}/novedades`);

export const crearNovedadTarea = (id, data) =>
  api.post(`/tareas/${id}/novedades`, data);

export const listarTareaItems = (tareaId) =>
  api.get(`/tareas/${tareaId}/items`);

export const cancelarTarea = (id, data) =>
  api.post(`/tareas/${id}/cancelar`, data);

export const configurarTareaItems = (tareaId, data) =>
  api.post(`/tareas/${tareaId}/items`, data);

export const actualizarCosecha = (tareaId, payload) =>
  api.patch(`/tareas/${tareaId}/detalles`, payload);

export const actualizarDetalles = (tareaId, payload) =>
  api.patch(`/tareas/${tareaId}/detalles`, payload);


// POST /tareas/:id/asignaciones
export const asignarUsuarios = (id, body) =>
  api.post(`/tareas/${id}/asignaciones`, body);


// --- Lotes / Cosechas / Tipos
export const listarLotes = () => api.get("/lotes");
export const listarCosechas = () => api.get("/cosechas");
export const listarTiposActividad = () => api.get("/tipos-actividad");

// 🔹 NUEVO: cerrar cosecha
export const cerrarCosecha = (id, payload) =>
  api.patch(`/cosechas/${id}/cerrar`, payload);


export const listarFincas = () => api.get("/fincas");
export const crearFinca = (data) => api.post("/fincas", data);
export const editarFinca = (id, data) => api.patch(`/fincas/${id}`, data);
export const obtenerContextoFinca = (id) => api.get(`/fincas/${id}/contexto`);
export const cambiarEstadoFinca = (id, data) =>
  api.patch(`/fincas/${id}/estado`, data);

// ✅ NUEVO: preview del siguiente secuencial + código (para el formulario)
export const previewSiguienteCosecha = (params = {}) =>
  api.get("/cosechas/next", { params });

// ✅ (Opcional pero útil) Listar cosechas por finca (si luego quieres filtros)
export const listarCosechasPorFinca = (fincaId) =>
  api.get("/cosechas", { params: { finca_id: fincaId } });



// ================= INVENTARIO =================

// ✅ FIX: usar api (baseURL + Authorization)
export const getResumenInventario = () => api.get("/inventario/resumen");

// Listar ítems (insumos/herramientas/equipos)
export const listarItemsInventario = (params = {}) =>
  api.get("/inventario/items", { params });

// Crear un ítem
export const crearItemInventario = (data) =>
  api.post("/inventario/items", data);

// Editar ítem
export const editarItemInventario = (id, data) =>
  api.patch(`/inventario/items/${id}`, data);

// Ajustar stock (entrada/salida)
export const ajustarStock = (id, data) =>
  api.post(`/inventario/items/${id}/ajustes`, data);

// Movimientos
export const listarMovimientosInventario = (params = {}) =>
  api.get("/inventario/movimientos", { params });

// Alertas de stock bajo
export const alertasStockBajo = () =>
  api.get("/inventario/alertas/stock-bajo");

// Unidades
export const listarUnidades = () => api.get("/unidades");

// Herramientas - préstamos
export const prestarHerramienta = (id, data) =>
  api.post(`/inventario/herramientas/${id}/prestar`, data);

export const devolverHerramienta = (id, data) =>
  api.post(`/inventario/herramientas/${id}/devolver`, data);

export const listarHerramientasNoDevueltas = () =>
  api.get("/inventario/herramientas/no-devueltas");


// === NUEVO ===
export const obtenerMiUsuario = () => api.get('/usuarios/me');
export const obtenerMisPagos    = () => api.get('/usuarios/me/pagos');   // o usa /pagos/mios si prefieres
export const obtenerMisTareas   = () => api.get('/usuarios/me/tareas');


export const crearLote = (payload) => api.post("/lotes", payload);
export const editarLote = (id, payload) => api.patch(`/lotes/${id}`, payload);

export const crearCosecha = (payload) => api.post("/cosechas", payload);

export function obtenerLote(id, params = {}) {
  return api.get(`/lotes/${id}`, { params });
}

// NUEVO: toggle estado lote
export const toggleEstadoLote = (id) =>
  api.patch(`/lotes/${id}/estado`);

// Busca la línea 284 y cámbiala por:
// Opcional: Si quieres una función genérica para corregir cualquier tarea
export const corregirTarea = (tareaId, payload) => 
  api.patch(`/tareas/${tareaId}/detalles`, payload);
// 👉 NUEVO: obtener una cosecha con sus periodos
export const obtenerCosecha = (id) => api.get(`/cosechas/${id}`);



// 👉 NUEVO: gestión de periodos
export const crearPeriodosCosecha = (cosechaId, periodos) =>
  api.post(`/cosechas/${cosechaId}/periodos`, periodos); // espera array

export const actualizarPeriodoCosecha = (periodoId, data) =>
  api.patch(`/cosechas/periodos/${periodoId}`, data);

export const eliminarPeriodoCosecha = (periodoId) =>
  api.delete(`/cosechas/periodos/${periodoId}`);


// ================= REPORTES =================

// ================= REPORTES (NUEVOS) =================

// 1. Dashboard Integral (Alta Dirección)
export const getDashboardIntegral = (params = {}) =>
  api.get("/reportes/dashboard", { params });

// 2. Producción / Rendimiento de Cosecha
export const getReporteRendimiento = (params = {}) =>
  api.get("/reportes/cosecha/rendimiento", { params });

// 3. Fitosanitario (Semáforo de seguridad)
export const getReporteFitosanitario = (params = {}) =>
  api.get("/reportes/fitosanitario", { params });

// 4. Operaciones (Tareas y Eficiencia)
export const getReporteOperaciones = (params = {}) =>
  api.get("/reportes/operaciones", { params });

// 5. Costos Operativos (Mano de obra + Insumos)
export const getReporteCostos = (params = {}) =>
  api.get("/reportes/costos", { params });


// ================= NOTIFICACIONES =================

export const listarNotificaciones = (params = {}) =>
  api.get("/notificaciones", { params });

export const marcarNotificacionLeida = (id) =>
  api.patch(`/notificaciones/${id}/leida`);

export const marcarTodasNotificacionesLeidas = () =>
  api.post("/notificaciones/leidas");


export const obtenerEstadisticas = () => axios.get('/usuarios/estadisticas');


export default api;
