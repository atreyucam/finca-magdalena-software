// backend/src/modules/tareas/indicadores.helper.js
const { schemasByTipo } = require('./indicadores.schemas');

/**
 * Valida el payload de indicadores según el tipo (código) y retorna el objeto parseado.
 * Si no hay schema para el tipo (ej. COSECHA), retorna null (no valida).
 */
function validateIndicadores(tipoCodigo, rawIndicadores) {
  const schema = schemasByTipo[tipoCodigo];
  if (!schema) return null; // no aplica validación por JSONB para este tipo
  // Zod lanzará si es inválido
  return schema.parse(rawIndicadores);
}

/**
 * Genera un resumen ligero por tipo (para UI/listas)
 * No reemplaza a indicadores; es solo un snapshot compacto.
 */
function buildResumen(tipoCodigo, indicadores) {
  if (!indicadores) return null;

  switch (tipoCodigo) {
    case 'PODA':
      return {
        fecha: indicadores.fecha,
        tipo: indicadores.tipo,
        plantas: indicadores.plantasIntervenidas
      };
    case 'MALEZAS':
      return {
        fecha: indicadores.fecha,
        metodo: indicadores.metodo,
        cobertura_pct: indicadores.coberturaPct
      };
    case 'NUTRICION':
      return {
        fecha: indicadores.fecha,
        metodo: indicadores.metodo,
        n_aportes: Array.isArray(indicadores.aportes) ? indicadores.aportes.length : 0
      };
    case 'FITOSANITARIA':
      return {
        fecha: indicadores.fecha,
        plaga: indicadores.plaga,
        n_productos: Array.isArray(indicadores.productos) ? indicadores.productos.length : 0
      };
    case 'ENFUNDADO':
      return {
        fecha: indicadores.fecha,
        tipo_bolsa: indicadores.tipoBolsa,
        bolsas_usadas: indicadores.bolsasUsadas ?? null
      };
    default:
      return null;
  }
}

/**
 * Nombre de campo de resumen en JSONB detalles, por tipo.
 * Ej: PODA -> 'resumen_poda'
 */
function resumenKey(tipoCodigo) {
  const m = {
    PODA: 'resumen_poda',
    MALEZAS: 'resumen_malezas',
    NUTRICION: 'resumen_nutricion',
    FITOSANITARIA: 'resumen_fito',
    ENFUNDADO: 'resumen_enfundado',
  };
  return m[tipoCodigo] || null;
}

module.exports = {
  validateIndicadores,
  buildResumen,
  resumenKey
};
