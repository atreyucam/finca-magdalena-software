import { ArrowUpCircle, ArrowDownCircle, ArrowRightLeft } from "lucide-react";
import { listarMovimientosInventario } from "../../api/apiClient";
import useListado from "../../hooks/useListado";
import {
  Tabla,
  TablaCabecera,
  TablaHead,
  TablaCuerpo,
  TablaFila,
  TablaCelda,
  TablaVacia,
} from "../ui/Tabla";
import Paginador from "../ui/Paginador";
import Badge from "../ui/Badge";

const UNIDADES_ENTERAS = new Set(["unidad", "unidades", "u", "und", "pz", "pieza", "piezas"]);
const UNIDADES_DECIMALES = new Set(["kg", "g", "mg", "lb", "l", "ml", "cc"]);

function normalizarUnidad(u) {
  return (u || "").toString().trim().toLowerCase();
}

function formatNumeroLocale(valor, maxDecimals = 2) {
  const n = Number(valor ?? 0);
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("es-EC", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(n);
}

function formatCantidad(valor, unidadRaw) {
  const n = Number(valor ?? 0);
  const unidad = normalizarUnidad(unidadRaw);

  if (!Number.isFinite(n)) return "0";

  if (UNIDADES_ENTERAS.has(unidad) || unidad === "") {
    return formatNumeroLocale(Math.trunc(n), 0);
  }

  if (UNIDADES_DECIMALES.has(unidad)) {
    return formatNumeroLocale(n, 2);
  }

  return formatNumeroLocale(n, 2);
}

function renderReferencia(m) {
  const ref = m?.referencia || {};
  if (ref?.tarea_id) return `Tarea #${ref.tarea_id}`;
  if (ref?.prestamo_id) return `Prestamo #${ref.prestamo_id}`;
  if (ref?.ajuste) return "Ajuste manual";
  return "—";
}

function tipoMovimientoKey(tipo) {
  const t = (tipo || "").toString().trim().toUpperCase();
  if (t === "ENTRADA") return "entrada";
  if (t === "SALIDA") return "salida";
  if (t === "AJUSTE_ENTRADA" || t === "AJUSTE ENTRADA") return "ajuste entrada";
  if (t === "AJUSTE_SALIDA" || t === "AJUSTE SALIDA") return "salida";
  return "default";
}

function iconoTipo(tipoKey) {
  if (tipoKey === "entrada") return ArrowDownCircle;
  if (tipoKey === "salida") return ArrowUpCircle;
  if (tipoKey === "ajuste entrada") return ArrowRightLeft;
  return ArrowRightLeft;
}

export default function VistaHistorial() {
  const {
    datos: movimientos,
    cargando,
    pagina,
    setPagina,
    totalPaginas,
    totalRegistros,
  } = useListado(listarMovimientosInventario);

  return (
    <div className="space-y-4 animate-in fade-in">
      <Tabla>
        <TablaCabecera>
          <TablaHead>Fecha</TablaHead>
          <TablaHead>Tipo</TablaHead>
          <TablaHead>Item</TablaHead>
          <TablaHead align="right">Cantidad</TablaHead>
          <TablaHead>Referencia</TablaHead>
        </TablaCabecera>

        <TablaCuerpo>
          {cargando ? (
            [...Array(5)].map((_, i) => (
              <TablaFila key={i}>
                <TablaCelda colSpan={5} className="py-6">
                  <div className="h-4 bg-slate-100 rounded animate-pulse" />
                </TablaCelda>
              </TablaFila>
            ))
          ) : movimientos.length === 0 ? (
            <TablaVacia mensaje="No hay movimientos registrados." colSpan={5} />
          ) : (
            movimientos.map((m) => {
              const tipoKey = tipoMovimientoKey(m.tipo);
              const Icono = iconoTipo(tipoKey);

              const unidad = (m.unidad || "").toString();
              const cantidadTxt = formatCantidad(m.cantidad, unidad);

              const esEntrada = tipoKey === "entrada" || tipoKey === "ajuste entrada";
              const signo = esEntrada ? "+" : "-";

              return (
                <TablaFila key={m.id}>
                  <TablaCelda className="text-xs text-slate-500">{new Date(m.fecha).toLocaleString()}</TablaCelda>

                  <TablaCelda>
                    <Badge variante={tipoKey}>{(m.tipo || "").toString().replaceAll("_", " ")}</Badge>
                  </TablaCelda>

                  <TablaCelda>
                    <span className="font-medium text-slate-800">{m.item}</span>
                  </TablaCelda>

                  <TablaCelda align="right">
                    <div
                      className={`flex justify-end items-center gap-1 font-mono font-bold ${
                        tipoKey === "entrada"
                          ? "text-emerald-600"
                          : tipoKey === "ajuste entrada"
                            ? "text-violet-700"
                            : "text-rose-600"
                      }`}
                    >
                      <Icono size={14} />
                      {signo}
                      {cantidadTxt} <span className="text-xs font-normal text-slate-400">{unidad}</span>
                    </div>
                  </TablaCelda>

                  <TablaCelda className="text-xs text-slate-500 truncate max-w-xs">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-700">{renderReferencia(m)}</span>
                      <span className="text-slate-500">{m.motivo || "—"}</span>
                    </div>
                  </TablaCelda>
                </TablaFila>
              );
            })
          )}
        </TablaCuerpo>
      </Tabla>

      <Paginador
        paginaActual={pagina}
        totalPaginas={totalPaginas}
        totalRegistros={totalRegistros}
        onCambiarPagina={setPagina}
      />
    </div>
  );
}
