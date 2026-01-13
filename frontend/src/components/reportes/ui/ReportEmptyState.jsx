// frontend/src/components/reportes/ui/ReportEmptyState.jsx
import EstadoVacio from "../../ui/EstadoVacio";

export default function ReportEmptyState({
  variant = "idle", // idle | empty | error | warn
  title,
  children,
}) {
  const presets = {
    idle: {
      tipo: "info",
      titulo: "Aún no hay resultados",
      body: (
        <>
          Configura los filtros y presiona <b>Consultar</b>.
        </>
      ),
    },
    empty: {
      tipo: "info",
      titulo: "No se encontraron datos",
      body: <>Prueba ajustando el rango de fechas o quitando filtros.</>,
    },
    error: {
      tipo: "error",
      titulo: "No se pudo cargar el reporte",
      body: <>Intenta nuevamente o revisa tu conexión.</>,
    },
    warn: {
      tipo: "warn",
      titulo: "Atención",
      body: <>Revisa los filtros seleccionados.</>,
    },
  };

  const p = presets[variant] || presets.idle;

  return (
    <EstadoVacio tipo={p.tipo} titulo={title || p.titulo}>
      {children ?? p.body}
    </EstadoVacio>
  );
}
