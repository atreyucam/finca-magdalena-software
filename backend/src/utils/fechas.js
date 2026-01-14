// backend/src/utils/fechas.js (por ejemplo)
function formatoFechaHoraCorta(fecha) {
  const d = new Date(fecha);
  return d.toLocaleString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,        // para 12h con am/pm
  });
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

const generarLabelAgricola = (fInicio, fFin) => {
  const inicio = new Date(fInicio);
  const mesI = MESES[inicio.getUTCMonth()];
  const anioI = inicio.getUTCFullYear();

  if (!fFin) return `[${mesI} ${anioI} - activa]`;

  const fin = new Date(fFin);
  const mesF = MESES[fin.getUTCMonth()];
  const anioF = fin.getUTCFullYear();

  if (anioI === anioF) {
    return `[${mesI} - ${mesF} ${anioI}]`;
  }
  return `[${mesI} ${anioI} - ${mesF} ${anioF}]`;
};

module.exports = { formatoFechaHoraCorta, generarLabelAgricola };