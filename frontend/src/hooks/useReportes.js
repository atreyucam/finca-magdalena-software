// src/hooks/useReportes.js
import { useEffect, useState } from "react";
import {
  reporteTareas,
  reporteProduccionResumen,
  reporteProduccionPorLote,
  reporteProduccionClasificacion,
  reporteProduccionMerma,
  reporteProduccionLogistica,
  reporteProduccionEventos,
} from "../api/apiClient";

const toYmd = (v) => {
  if (!v) return "";
  const d = new Date(v);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const default30dRange = () => {
  const hoy = new Date();
  const desde = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { desde: toYmd(desde), hasta: toYmd(hoy) };
};

export default function useReportes() {
  const [tab, setTab] = useState("tareas");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [data, setData] = useState({
    tareas: null,
    produccion: null, // ✅ nuevo
  });

  const rango = default30dRange();

  const [filtros, setFiltros] = useState({
    // ✅ tareas (como lo tenías)
    finca_id: "",
    cosecha_id: "",
    lote_ids: [],
    tipo_codigo: "",
    estado: "",
    desde: "",
    hasta: "",
    page: 1,
    pageSize: 20,

    // ✅ producción (nuevo)
    produccion: {
      finca_id: "",
      cosecha_id: "",
      lote_id: "",
      desde: rango.desde,
      hasta: rango.hasta,
    },
  });

  const setFiltro = (key, value) => {
    setFiltros((prev) => ({ ...prev, [key]: value }));
  };

  const setFiltroProduccion = (key, value) => {
    setFiltros((prev) => ({
      ...prev,
      produccion: { ...(prev.produccion || {}), [key]: value },
    }));
  };

  const limpiar = () => {
    setError(null);

    if (tab === "tareas") {
      setFiltros((prev) => ({
        ...prev,
        cosecha_id: "",
        lote_ids: [],
        tipo_codigo: "",
        estado: "",
        desde: "",
        hasta: "",
        page: 1,
        pageSize: 20,
      }));
      setData((prev) => ({ ...prev, tareas: null }));
      return;
    }

    if (tab === "produccion") {
      const r = default30dRange();
      setFiltros((prev) => ({
        ...prev,
        produccion: {
          ...(prev.produccion || {}),
          cosecha_id: "",
          lote_id: "",
          desde: r.desde,
          hasta: r.hasta,
        },
      }));
      setData((prev) => ({ ...prev, produccion: null }));
      return;
    }
  };

  const generar = async (override = {}) => {
    setLoading(true);
    setError(null);

    try {
      if (tab === "tareas") {
        const f = { ...filtros, ...override };

        const params = {
          finca_id: f.finca_id,
          page: f.page,
          pageSize: f.pageSize,
        };

        if (f.cosecha_id) params.cosecha_id = f.cosecha_id;
        if (f.lote_ids?.length) params.lote_ids = f.lote_ids.join(",");
        if (f.tipo_codigo) params.tipo_codigo = f.tipo_codigo;
        if (f.estado) params.estado = f.estado;
        if (f.desde) params.desde = f.desde;
        if (f.hasta) params.hasta = f.hasta;

        const payload = await reporteTareas(params);
        setData((prev) => ({ ...prev, tareas: payload }));
        return;
      }

      if (tab === "produccion") {
        const base = { ...(filtros.produccion || {}), ...(override || {}) };

        if (!base.finca_id) {
          setError("Selecciona una finca para consultar producción.");
          setLoading(false);
          return;
        }

        const params = {
          finca_id: base.finca_id,
          desde: base.desde,
          hasta: base.hasta,
        };
        if (base.cosecha_id) params.cosecha_id = base.cosecha_id;
        if (base.lote_id) params.lote_id = base.lote_id;

        // ✅ 6 consultas (puedes paralelizarlas)
        const [
          resumen,
          porLote,
          clasificacion,
          merma,
          logistica,
          eventos,
        ] = await Promise.all([
          reporteProduccionResumen(params),
          reporteProduccionPorLote(params),
          reporteProduccionClasificacion(params),
          reporteProduccionMerma(params),
          reporteProduccionLogistica(params),
          reporteProduccionEventos(params),
        ]);

        setData((prev) => ({
          ...prev,
          produccion: { resumen, porLote, clasificacion, merma, logistica, eventos },
        }));
        return;
      }
    } catch (err) {
      console.error("❌ [useReportes] Error:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Error al conectar con el servidor."
      );
      if (tab === "tareas") setData((prev) => ({ ...prev, tareas: null }));
      if (tab === "produccion") setData((prev) => ({ ...prev, produccion: null }));
    } finally {
      setLoading(false);
    }
  };

  // si quieres, no autogenerar nada
  useEffect(() => {}, [tab]);

  return {
    tab,
    setTab,
    filtros,
    setFiltro,
    setFiltros,
    setFiltroProduccion, // ✅ nuevo
    generar,
    limpiar,            // ✅ nuevo
    loading,
    error,
    data,
  };
}
