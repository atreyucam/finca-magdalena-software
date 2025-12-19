// backend/src/utils/units.js

/**
 * Sistema estático de conversiones agronómicas.
 * Base: Sistema Métrico Internacional (SI)
 */

const FACTORS = {
  // Volumen (Base: ml o cc)
  'l': 1000,
  'ml': 1,
  'cc': 1,
  'gal': 3785.41, // Galón US
  'm3': 1000000,

  // Peso (Base: g)
  'kg': 1000,
  'g': 1,
  'lb': 453.592,
  'quintal': 45359.2, // Quintal métrico (100lb aprox referencial)
  'oz': 28.3495,

  // Unidades
  'unidad': 1,
  'saco': 1 // Referencial, usualmente requiere conversión manual por peso
};

/**
 * Obtiene el factor para normalizar a la unidad base del sistema (g o ml).
 * @param {string} codigoUnidad - Ej: 'kg', 'l'
 */
function getBaseFactor(codigoUnidad) {
  const code = codigoUnidad.toLowerCase();
  return FACTORS[code] || 1;
}

/**
 * Convierte una cantidad de una unidad a otra.
 * @param {number} cantidad - Cantidad a convertir
 * @param {string} fromCode - Código unidad origen (ej: 'kg')
 * @param {string} toCode - Código unidad destino (ej: 'g')
 */
exports.convertir = (cantidad, fromCode, toCode) => {
  if (fromCode === toCode) return Number(cantidad);
  
  const fromF = getBaseFactor(fromCode);
  const toF = getBaseFactor(toCode);
  
  // Convertir a base y luego a destino
  // Ej: 5 kg -> g: 5 * 1000 / 1 = 5000
  return (Number(cantidad) * fromF) / toF;
};

exports.getFactorConversion = (fromCode, toCode) => {
  const fromF = getBaseFactor(fromCode);
  const toF = getBaseFactor(toCode);
  return fromF / toF;
};