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

// --- Pagos
export const consolidarSemana = (data) => api.post("/pagos/semana", data);
export const obtenerSemana = (params = {}) =>
  api.get("/pagos/semana", { params });
export const editarDetallePago = (nominaId, detalleId, data) =>
  api.patch(`/pagos/semana/${nominaId}/detalles/${detalleId}`, data);
export const upsertDetallePago = (nominaId, data) =>
  api.post(`/pagos/semana/${nominaId}/detalles`, data);
export const aprobarSemana = (nominaId) =>
  api.post(`/pagos/semana/${nominaId}/aprobar`);
export const generarRecibo = (nominaId, detalleId) =>
  api.post(`/pagos/semana/${nominaId}/recibos/${detalleId}`);
export const misRecibos = () => api.get("/pagos/mios");
export const obtenerSemanaPorUsuario = (id) =>
  api.get(`/usuarios/${id}/pagos`);


// --- Tareas
export const listarTareas = (params) => api.get("/tareas", { params });
export const obtenerTarea = (id) => api.get(`/tareas/${id}`);
export const crearTarea = (data) => api.post("/tareas", data);
export const asignarUsuariosTarea = (id, data) =>
  api.post(`/tareas/${id}/asignaciones`, data);

// frontend src/api/apiClient.ts
export const iniciarTarea = (id, body) => api.post(`/tareas/${id}/iniciar`, body);

export const completarTarea = (id, data) =>
  api.post(`/tareas/${id}/completar`, data);
export const verificarTarea = (id, data) =>
  api.post(`/tareas/${id}/verificar`, data);
export const listarInsumosTarea = (id) => api.get(`/tareas/${id}/insumos`);
export const configurarInsumosTarea = (id, data) =>
  api.post(`/tareas/${id}/insumos`, data);
export const listarNovedadesTarea = (id) => api.get(`/tareas/${id}/novedades`);
export const crearNovedadTarea = (id, data) =>
  api.post(`/tareas/${id}/novedades`, data);

// --- Lotes / Cosechas / Tipos
export const listarLotes = () => api.get("/lotes");
export const listarCosechas = () => api.get("/cosechas");
export const listarTiposActividad = () => api.get("/tipos-actividad");

// POST /tareas/:id/asignaciones
export const asignarUsuarios = (id, body) =>
  api.post(`/tareas/${id}/asignaciones`, body);

export const actualizarAsignaciones = (id, body) =>
  api.patch(`/tareas/${id}/ActualizarAsignaciones`, body);

// ================= INVENTARIO =================

// Listar ítems (insumos/herramientas)
export const listarItemsInventario = (params = {}) =>
  api.get("/inventario/items", { params });

// Crear un ítem
export const crearItemInventario = (data) =>
  api.post("/inventario/items", data);

// Editar ítem
export const editarItemInventario = (id, data) =>
  api.patch(`/inventario/items/${id}`, data);

// Ajustar stock (entrada, salida, ajuste)
export const ajustarStock = (id, data) =>
  api.post(`/inventario/items/${id}/ajustes`, data);

// Listar movimientos de inventario
export const listarMovimientosInventario = (params = {}) =>
  api.get("/inventario/movimientos", { params });

// Alertas de stock bajo
export const alertasStockBajo = () =>
  api.get("/inventario/alertas/stock-bajo");

// --- Unidades
export const listarUnidades = () => api.get("/unidades");




// ================= HERRAMIENTAS =================

// Prestar herramienta
export const prestarHerramienta = (id, data) =>
  api.post(`/inventario/herramientas/${id}/prestar`, data);

// Devolver herramienta
export const devolverHerramienta = (id, data) =>
  api.post(`/inventario/herramientas/${id}/devolver`, data);

// Listar herramientas no devueltas
export const listarHerramientasNoDevueltas = () =>
  api.get("/inventario/herramientas/no-devueltas");

// 👇 Export default para que uses `import api from "../api/apiClient"`

export async function listarRequerimientosTarea(tareaId){
  return api.get(`/tareas/${tareaId}/requerimientos`);
}
// src/api/apiClient.js
export const configurarRequerimientos = (tareaId, payload) =>
  api.patch(`/tareas/${tareaId}/requerimientos`, payload);


export default api;
