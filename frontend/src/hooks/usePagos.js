// frontend/src/hooks/usePagos.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  obtenerSemana,
  consolidarSemana,
  aprobarSemana,
  listarSemanasBorrador,
  eliminarSemana,
  descargarRecibo,
  bulkUpdateDetallesPago,
  toggleExcluirDetallePago,
  obtenerTareasDetallePago,
  historialPagos,
} from "../api/apiClient";

// Helper semana ISO actual
const getCurrentISOWeek = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
};

const readBlobErrorMessage = async (err) => {
  try {
    const data = err?.response?.data;
    if (data instanceof Blob) {
      const text = await data.text();
      const json = JSON.parse(text);
      return json?.message || json?.error || text;
    }
  } catch {
    // Ignorar parse de blob; se usa fallback abajo.
  }
  return err?.response?.data?.message || err?.message || "Error";
};

// ===== Helpers descarga =====
const getFilenameFromDisposition = (disposition) => {
  if (!disposition) return null;
  // content-disposition: attachment; filename="recibo.pdf"
  const match = /filename\*?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i.exec(disposition);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

const downloadBlob = (blob, filename = "archivo.pdf") => {
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
};


export default function usePagos() {
  const [semanaIso, setSemanaIso] = useState(getCurrentISOWeek());

  const [nomina, setNomina] = useState(null);
  const [borradores, setBorradores] = useState([]);

  const [loadingNomina, setLoadingNomina] = useState(false);
  const [procesando, setProcesando] = useState(false);

  // Toggle “Mostrar excluidos” lo maneja la page, pero el hook carga con param
  const cargarNomina = useCallback(async (iso, incluirExcluidos = true) => {
    if (!iso) return;
    setLoadingNomina(true);
    try {
      const res = await obtenerSemana({
        semana_iso: iso,
        incluir_excluidos: incluirExcluidos ? "true" : "false",
      });
      setNomina(res.data);
    } catch (err) {
      if (err.response?.status !== 404) toast.error("Error al cargar la nómina");
      setNomina(null);
    } finally {
      setLoadingNomina(false);
    }
  }, []);

  const cargarBorradores = useCallback(async () => {
    try {
      const res = await listarSemanasBorrador();
      setBorradores(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Pendientes locales (camino B)
  // pending = { [detalleId]: { ...patch } }
  const [pending, setPending] = useState({});

  const setPendiente = useCallback((detalleId, patch) => {
    setPending((prev) => ({
      ...prev,
      [detalleId]: { ...(prev[detalleId] || {}), ...patch },
    }));
  }, []);

  const limpiarPendiente = useCallback((detalleId) => {
    setPending((prev) => {
      const copy = { ...prev };
      delete copy[detalleId];
      return copy;
    });
  }, []);

  const limpiarTodoPendiente = useCallback(() => setPending({}), []);

  const pendientesCount = useMemo(() => Object.keys(pending).length, [pending]);

  // Acciones principales
  const consolidar = useCallback(async () => {
    setProcesando(true);
    try {
      const res = await consolidarSemana({ semana_iso: semanaIso });
      setNomina(res.data);
      toast.success("Semana consolidada");
      await cargarBorradores();
      limpiarTodoPendiente();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al consolidar");
    } finally {
      setProcesando(false);
    }
  }, [semanaIso, cargarBorradores, limpiarTodoPendiente]);

  const guardarBorradorBulk = useCallback(async () => {
    if (!nomina?.id) return;
    const items = Object.entries(pending).map(([id, patch]) => ({
      id: Number(id),
      ...patch,
    }));
    if (items.length === 0) {
      toast.message("No hay cambios pendientes");
      return;
    }

    setProcesando(true);
    try {
      await bulkUpdateDetallesPago(nomina.id, { items });
      toast.success("Borrador guardado");
      await cargarNomina(semanaIso, true); // volvemos a cargar (con excluidos)
      limpiarTodoPendiente();
    } catch (err) {
      toast.error(err.response?.data?.message || "No se pudo guardar el borrador");
    } finally {
      setProcesando(false);
    }
  }, [nomina?.id, pending, semanaIso, cargarNomina, limpiarTodoPendiente]);

  const toggleExcluir = useCallback(async (detalleId, excluido) => {
    if (!nomina?.id) return;
    setProcesando(true);
    try {
      await toggleExcluirDetallePago(nomina.id, detalleId, { excluido });
      toast.success(excluido ? "Excluido" : "Incluido");
      // OJO: al excluir/incluir preferimos refrescar para totales consistentes
      await cargarNomina(semanaIso, true);
    } catch (e) {
      toast.error(e.response?.data?.message || "No se pudo actualizar");
    } finally {
      setProcesando(false);
    }
  }, [nomina?.id, semanaIso, cargarNomina]);

  const aprobar = useCallback(async () => {
    if (!nomina?.id) return;

    // si hay pendientes, forzamos guardado antes
    if (pendientesCount > 0) {
      toast.message("Guardando cambios pendientes antes de aprobar…");
      await guardarBorradorBulk();
    }

    // revalidar después del bulk
    setProcesando(true);
    try {
      await aprobarSemana(nomina.id);
      toast.success("Nómina aprobada");
      await cargarNomina(semanaIso, true);
      await cargarBorradores();
    } catch (e) {
      toast.error(e.response?.data?.message || "Error al aprobar");
    } finally {
      setProcesando(false);
    }
  }, [nomina?.id, semanaIso, cargarNomina, cargarBorradores, pendientesCount, guardarBorradorBulk]);

  const eliminar = useCallback(async (id) => {
    if (!confirm("¿Eliminar este borrador? Se perderán los cálculos.")) return;
    setProcesando(true);
    try {
      await eliminarSemana(id);
      toast.success("Borrador eliminado");
      if (nomina?.id === id) setNomina(null);
      await cargarBorradores();
      limpiarTodoPendiente();
    } catch (e) {
      toast.error(e.response?.data?.message || "Error al eliminar");
    } finally {
      setProcesando(false);
    }
  }, [nomina?.id, cargarBorradores, limpiarTodoPendiente]);

const generarReciboPago = useCallback(async (detalleId) => {
  try {
    const resp = await descargarRecibo(detalleId, { download: true });

    // filename
    const dispo = resp.headers?.["content-disposition"];
    const headerName = getFilenameFromDisposition(dispo);
    const fallback = `recibo_${semanaIso}_${detalleId}.pdf`;

    downloadBlob(resp.data, headerName || fallback);
  } catch (e) {
    toast.error(await readBlobErrorMessage(e));
  }
}, [semanaIso]);




  const cargarDetalleTareas = useCallback(async (nominaId, detalleId) => {
    const res = await obtenerTareasDetallePago(nominaId, detalleId);
    return res.data;
  }, []);

  // ==========================
  // TAB 2: Historial + filtros
  // ==========================
  const [historial, setHistorial] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const cargarHistorial = useCallback(async (filtros = {}) => {
    setLoadingHistorial(true);
    try {
      const res = await historialPagos(filtros);
      setHistorial(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      toast.error(e.response?.data?.message || "No se pudo cargar historial");
      setHistorial([]);
    } finally {
      setLoadingHistorial(false);
    }
  }, []);

  // Carga inicial (Tab 1)
  useEffect(() => {
    cargarNomina(semanaIso, true);
    cargarBorradores();
  }, [semanaIso, cargarNomina, cargarBorradores]);

  return {
    // semana
    semanaIso,
    setSemanaIso,

    // tab 1
    nomina,
    borradores,
    loadingNomina,
    procesando,

    consolidar,
    guardarBorradorBulk,
    toggleExcluir,
    aprobar,
    eliminar,
    generarReciboPago,

    // pendientes (camino B)
    pending,
    pendientesCount,
    setPendiente,
    limpiarPendiente,
    limpiarTodoPendiente,

    // modal
    cargarDetalleTareas,

    // tab 2
    historial,
    loadingHistorial,
    cargarHistorial,

    // util
    recargarNomina: (incluirExcluidos = true) => cargarNomina(semanaIso, incluirExcluidos),
  };
}
