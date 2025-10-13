// backend/src/modules/inventario/unidades.service.js
const { Op } = require('sequelize');
const { models } = require('../../db');

const CODES_POR_CATEGORIA = {
  Insumo: ['kg', 'g', 'l', 'ml', 'gal'],
  Herramienta: ['unidad'],
  Equipo: ['unidad'],
};

exports.listarUnidades = async ({ q, categoria } = {}) => {
  const where = {};

  // filtro por categoría (opcional)
  if (categoria && CODES_POR_CATEGORIA[categoria]) {
    where.codigo = { [Op.in]: CODES_POR_CATEGORIA[categoria] };
  }

  // búsqueda por nombre/código (opcional)
  if (q && q.trim()) {
    const like = { [Op.iLike]: `%${q.trim()}%` };
    where[Op.or] = [{ nombre: like }, { codigo: like }];
  }

  const list = await models.Unidad.findAll({
    where,
    order: [['nombre', 'ASC']],
    attributes: ['id', 'codigo', 'nombre'],
  });

  // El frontend usa {codigo, nombre} (+id por si quieres)
  return list.map(u => ({ id: u.id, codigo: u.codigo, nombre: u.nombre }));
};
