// src/hooks/useReportes.js
import { useEffect, useState } from "react";
import { reporteTareas } from "../api/apiClient";

export default function useReportes() {
  // ✅ desde cero: solo tareas
  const [tab, setTab] = useState("tareas");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [data, setData] = useState({
    tareas: null, // aquí guardamos el payload del backend
  });

  // ✅ filtros compatibles con tu backend
  const [filtros, setFiltros] = useState({
    finca_id: "",        // puedes dejarlo fijo por ahora
    cosecha_id: "",     // si vacío => backend usa activa (default)
    lote_ids: [],       // array de ids, se enviará como csv
    tipo_codigo: "",    // "PODA" | "MALEZA" | ...
    estado: "",         // "Pendiente" | ...
    desde: "",
    hasta: "",
    page: 1,
    pageSize: 20,
  });

  const setFiltro = (key, value) => {
    setFiltros((prev) => ({ ...prev, [key]: value }));
  };

const generar = async (override = {}) => {
  setLoading(true);
  setError(null);

  try {
    console.log("🧪 [useReportes.generar] override:", override);
    console.log("🧪 [useReportes.generar] filtros (state):", filtros);

    const f = { ...filtros, ...override };
    console.log("🧪 [useReportes.generar] merged f:", f);

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

    console.log("🧪 [useReportes.generar] params final:", params);

    const payload = await reporteTareas(params);

    console.log("✅ [useReportes.generar] payload recibido:", payload);
    console.log("✅ [useReportes.generar] payload.data.length:", payload?.data?.length);
    console.log("✅ [useReportes.generar] payload.total:", payload?.total);

    setData({ tareas: payload });
  } catch (err) {
    console.error("❌ [useReportes] Error:", err);
    setError(err?.response?.data?.message || err?.message || "Error al conectar con el servidor.");
    setData({ tareas: null });
  } finally {
    setLoading(false);
  }
};


  // ✅ desde cero: NO autogeneramos por tab (porque tab ya no importa)
  useEffect(() => {
    if (tab === "tareas") {
      // opcional: si quieres que cargue una vez al entrar
      // generar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return {
    tab,
    setTab,
    filtros,
    setFiltro,
    setFiltros, // por si en tareas panel quieres setear varios de golpe
    generar,
    loading,
    error,
    data,
  };
}
