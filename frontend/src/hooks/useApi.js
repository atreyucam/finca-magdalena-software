import { useState } from "react";
import api from "../api/apiClient"; // 👈 tu cliente axios
import useToast from "./useToast";

/**
 * Hook genérico para consumir tu apiClient con manejo automático de:
 * - Cargando (loading)
 * - Toast éxito/error
 * - Respuesta JSON directa
 */
export default function useApi() {
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = useState(false);

  /**
   * Llamada genérica a la API
   * @param {string} method - "get" | "post" | "patch" | "delete"
   * @param {string} url - endpoint de la API (ej: "/usuarios")
   * @param {object} [data] - body (POST/PATCH) o params (GET)
   * @param {string|null} [successMsg] - mensaje toast en caso de éxito
   * @param {object} [options] - { silent: true } para no mostrar toast de error
   */
  const callApi = async (method, url, data = {}, successMsg = null, options = {}) => {
    setLoading(true);
    try {
      let res;

      if (method === "get") {
        res = await api.get(url, { params: data });
      } else if (method === "post") {
        res = await api.post(url, data);
      } else if (method === "patch") {
        res = await api.patch(url, data);
      } else if (method === "delete") {
        res = await api.delete(url, { data });
      } else {
        throw new Error(`Método no soportado: ${method}`);
      }

      if (successMsg) {
        showSuccess(successMsg);
      }

      return res.data; // 👈 siempre devolvemos solo el payload
    } catch (err) {
      if (!options?.silent) {
        showError(err);
      }
      throw err; // re-lanzamos si el componente necesita manejarlo
    } finally {
      setLoading(false);
    }
  };

  return { callApi, loading };
}
