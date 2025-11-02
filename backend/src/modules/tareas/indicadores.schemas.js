// backend/src/modules/tareas/indicadores.schemas.js
const { z } = require('zod');

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const PodaSchema = z.object({
  version: z.number().int().default(1),
  tipo: z.enum(['formacion','produccion','sanitaria']),
  fecha: isoDate,
  plantasIntervenidas: z.number().int().nonnegative(),
  observaciones: z.string().optional()
});

const MalezasSchema = z.object({
  version: z.number().int().default(1),
  metodo: z.enum(['manual','mecanico','cultural','herbicida']),
  fecha: isoDate,
  coberturaPct: z.number().min(0).max(100),
  observaciones: z.string().optional()
});

const NutricionSchema = z.object({
  version: z.number().int().default(1),
  fecha: isoDate,
  metodo: z.enum(['fertirriego','suelo','foliar','otro']),
  aportes: z.array(z.object({
    item_id: z.number().int().positive(),
    dosis: z.number().positive(),
    unidad: z.string().min(1), // 'kg','g','L'
    base: z.enum(['porHa','porPlanta'])
  })).min(1),
  observaciones: z.string().optional()
});

const FitosanitariaSchema = z.object({
  version: z.number().int().default(1),
  fecha: isoDate,
  plaga: z.string().min(1),
  nivelDano: z.string().optional(),
  equipo: z.string().optional(),
  volumenLHa: z.number().positive().optional(),
  carenciaDias: z.number().int().nonnegative().optional(),
  productos: z.array(z.object({
    item_id: z.number().int().positive(),
    dosis: z.number().positive(),
    unidad: z.string().min(1)
  })).min(1),
  observaciones: z.string().optional()
});

const EnfundadoSchema = z.object({
  version: z.number().int().default(1),
  fecha: isoDate,
  tipoBolsa: z.string().min(1),
  bolsasUsadas: z.number().int().nonnegative().optional(),
  observaciones: z.string().optional()
});

const schemasByTipo = {
  PODA: PodaSchema,
  MALEZAS: MalezasSchema,
  NUTRICION: NutricionSchema,
  FITOSANITARIA: FitosanitariaSchema,
  ENFUNDADO: EnfundadoSchema,
  // COSECHA: se gestiona en tablas; aquí no validamos via JSONB
};

module.exports = { schemasByTipo };
