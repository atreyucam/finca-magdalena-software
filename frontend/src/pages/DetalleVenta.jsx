import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  CircleDollarSign,
  NotebookPen,
  Package2,
  ReceiptText,
  Rows3,
  Tag,
  UserRound,
  Wallet,
} from "lucide-react";
import { obtenerVenta } from "../api/apiClient";
import useToast from "../hooks/useToast";
import useAuthStore from "../store/authStore";
import PageIntro from "../components/app/PageIntro";
import LinkVolver from "../components/ui/LinkVolver";
import Boton from "../components/ui/Boton";
import Badge from "../components/ui/Badge";
import VentanaModal from "../components/ui/VentanaModal";
import ModalLiquidacionVenta from "../components/ventas/ModalLiquidacionVenta";
import ModalPagoVenta from "../components/ventas/ModalPagoVenta";
import {
  Tabla,
  TablaCabecera,
  TablaHead,
  TablaCuerpo,
  TablaFila,
  TablaCelda,
  TablaVacia,
} from "../components/ui/Tabla";

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function fmtMoney(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

function titleCaseLabel(value) {
  if (!value) return "—";
  const raw = String(value).trim().toLowerCase();
  if (!raw) return "—";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function tipoLabel(value) {
  if (!value) return "—";
  const map = {
    EXPORTACION: "Exportacion",
    NACIONAL: "Nacional",
  };
  return map[String(value).toUpperCase()] || titleCaseLabel(value);
}

function formaPagoLabel(value) {
  if (!value) return "—";
  return titleCaseLabel(value);
}

function estadoUi(value) {
  const raw = String(value || "").toUpperCase();
  if (raw === "LIQUIDADA") {
    return { label: "Pendiente", variante: "pendiente" };
  }
  if (raw === "PAGADA") {
    return { label: "Pagada", variante: "pagada" };
  }
  if (raw === "PENDIENTE") {
    return { label: "Pendiente", variante: "pendiente" };
  }
  if (raw === "CANCELADA") {
    return { label: "Cancelada", variante: "cancelada" };
  }
  return { label: titleCaseLabel(value), variante: String(value || "").toLowerCase() || "default" };
}

function iconColor(icon) {
  if (icon === CalendarDays) return "text-blue-600";
  if (icon === UserRound) return "text-slate-500";
  if (icon === Tag) return "text-emerald-600";
  if (icon === CircleDollarSign) return "text-emerald-600";
  if (icon === Package2) return "text-amber-600";
  if (icon === NotebookPen) return "text-sky-600";
  if (icon === Rows3) return "text-violet-600";
  if (icon === FileText) return "text-slate-500";
  return "text-slate-500";
}

function modalTitle(title) {
  return <h3 className="text-2xl font-bold text-slate-900 leading-tight">{title}</h3>;
}

export default function DetalleVenta() {
  const { id } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const role = useAuthStore((s) => s.getRole()) || "";
  const isOwner = role === "Propietario";

  const base = useMemo(
    () => `/${location.pathname.split("/")[1] || "owner"}`,
    [location.pathname]
  );

  const [cargando, setCargando] = useState(true);
  const [venta, setVenta] = useState(null);

  const [modalLiquidacionAbierto, setModalLiquidacionAbierto] = useState(false);
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);

  const cargarVenta = useCallback(async () => {
    try {
      setCargando(true);
      const res = await obtenerVenta(id);
      setVenta(res?.data || null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "No se pudo cargar el detalle de venta");
    } finally {
      setCargando(false);
    }
  }, [id, toast]);

  useEffect(() => {
    cargarVenta();
  }, [cargarVenta]);

  const limpiarAccionQuery = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("accion");
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    if (!venta || !isOwner) return;

    const accion = String(searchParams.get("accion") || "").toLowerCase();
    if (accion === "liquidar" && venta.estado === "PENDIENTE") {
      setModalLiquidacionAbierto(true);
    }
    if (accion === "pagar" && venta.estado === "LIQUIDADA") {
      setModalPagoAbierto(true);
    }
  }, [searchParams, venta, isOwner]);

  const detalles = useMemo(
    () => (Array.isArray(venta?.detalles) ? venta.detalles : []),
    [venta]
  );
  const estadoView = useMemo(() => estadoUi(venta?.estado), [venta?.estado]);

  const onVentaActualizada = (updatedVenta) => {
    setVenta(updatedVenta || null);
    setModalLiquidacionAbierto(false);
    setModalPagoAbierto(false);
    limpiarAccionQuery();
  };

  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        <div className="mb-6">
          <LinkVolver to={`${base}/ventas`} label="Volver a ventas" />
        </div>

        {cargando ? (
          <div className="rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
            Cargando detalle de venta...
          </div>
        ) : !venta ? (
          <div className="rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
            No se encontró la venta solicitada.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <PageIntro title="Detalle de venta" subtitle={null} />
                <div className="text-3xl font-bold text-slate-900 -mt-1">
                  Factura: <span>{venta.numero_factura}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-base">
                  <span className="font-medium text-slate-900">Registrado por:</span>
                  <span className="font-medium text-slate-700">{venta.creado_por?.nombre || "—"}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <Badge variante={estadoView.variante}>{estadoView.label}</Badge>
                {isOwner && venta.estado === "PENDIENTE" && (
                  <Boton variante="ambar" onClick={() => setModalLiquidacionAbierto(true)}>
                    <ReceiptText className="mr-2 h-4 w-4" />
                    Registrar liquidación
                  </Boton>
                )}
                {isOwner && venta.estado === "LIQUIDADA" && (
                  <Boton variante="primario" onClick={() => setModalPagoAbierto(true)}>
                    <Wallet className="mr-2 h-4 w-4" />
                    Registrar pago
                  </Boton>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(260px,30%)_minmax(0,70%)]">
              <div className="space-y-6">
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <ResumenTabla
                    rows={[
                      { icon: CalendarDays, label: "Fecha", value: fmtDate(venta.created_at || venta.fecha_entrega) },
                      { icon: UserRound, label: "Cliente", value: venta.cliente?.nombre || "—" },
                      { icon: Tag, label: "Tipo", value: tipoLabel(venta.tipo_venta) },
                      { icon: CircleDollarSign, label: "Forma de pago", value: formaPagoLabel(venta.forma_pago) },
                      ...(venta.observacion_pago
                        ? [{ icon: NotebookPen, label: "Observación de pago", value: venta.observacion_pago }]
                        : []),
                      { icon: Rows3, label: "Estado", value: <Badge variante={estadoView.variante}>{estadoView.label}</Badge> },
                    ]}
                  />
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <ResumenTabla
                    rows={[
                      {
                        icon: Package2,
                        iconClass: "text-amber-600",
                        label: "Gavetas entregadas",
                        value: venta.gavetas_entregadas ?? "—",
                      },
                      {
                        icon: Package2,
                        iconClass: "text-rose-600",
                        label: "Gavetas devueltas",
                        value: venta.gavetas_devueltas ?? "—",
                      },
                      {
                        icon: Package2,
                        iconClass: "text-emerald-600",
                        label: "Gavetas útiles",
                        value: venta.gavetas_utiles ?? "—",
                      },
                    ]}
                  />
                </div>

                {venta.observacion ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <span className="font-bold text-slate-900">Observación:</span>{" "}
                    {venta.observacion}
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <ResumenTabla
                    rows={[
                      { icon: NotebookPen, label: "Número de recibo", value: venta.numero_recibo || "—" },
                      { icon: CalendarDays, label: "Fecha entrega", value: fmtDate(venta.fecha_entrega) },
                      { icon: Package2, label: "Lote", value: venta.lote?.nombre || "—" },
                    ]}
                    compact
                  />
                </div>

                <Tabla>
                  <TablaCabecera>
                    <TablaHead>Clase</TablaHead>
                    <TablaHead align="right">Peso (kg)</TablaHead>
                    <TablaHead align="right">Precio</TablaHead>
                    <TablaHead align="right">Subtotal</TablaHead>
                  </TablaCabecera>
                  <TablaCuerpo>
                    {detalles.length === 0 ? (
                      <TablaVacia mensaje="Aún no hay liquidación registrada." colSpan={4} />
                    ) : (
                      detalles.map((d) => (
                        <TablaFila key={d.id}>
                          <TablaCelda className="font-semibold text-slate-800">
                            {titleCaseLabel(d.clase_label || d.clase)}
                          </TablaCelda>
                          <TablaCelda align="right" className="font-mono">
                            {d.peso_kg}
                          </TablaCelda>
                          <TablaCelda align="right" className="font-mono">
                            {fmtMoney(d.precio_unitario)}
                          </TablaCelda>
                          <TablaCelda align="right" className="font-mono font-bold text-slate-900">
                            {fmtMoney(d.subtotal)}
                          </TablaCelda>
                        </TablaFila>
                      ))
                    )}
                  </TablaCuerpo>
                </Tabla>

                <div className="flex justify-end">
                  <div className="min-w-[240px] overflow-hidden rounded-2xl border border-slate-200">
                    <div className="grid grid-cols-[1fr_auto] bg-slate-50">
                      <div className="flex items-center justify-center px-4 py-3 text-base font-bold text-slate-900">
                        Total
                      </div>
                      <div className="border-l border-slate-200 px-4 py-3 text-center text-lg font-bold text-slate-900">
                        {fmtMoney(venta.total)}
                      </div>
                    </div>
                  </div>
                </div>

                {venta.reclasificacion ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Reclasificación aplicada: <span className="font-semibold">{venta.reclasificacion.descripcion}</span>
                    {" "}({venta.reclasificacion.gavetas} gavetas).
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>

      <VentanaModal
        abierto={modalLiquidacionAbierto}
        cerrar={() => {
          setModalLiquidacionAbierto(false);
          limpiarAccionQuery();
        }}
        titulo={modalTitle("Registrar liquidación")}
        descripcion="Fase 2: número de recibo, clases, kilos, precios y gavetas devueltas/útiles."
        maxWidthClass="sm:max-w-[min(1100px,calc(100vw-1rem))]"
      >
        <ModalLiquidacionVenta
          abierto={modalLiquidacionAbierto}
          venta={venta}
          onGuardado={onVentaActualizada}
          onCancelar={() => {
            setModalLiquidacionAbierto(false);
            limpiarAccionQuery();
          }}
        />
      </VentanaModal>

      <VentanaModal
        abierto={modalPagoAbierto}
        cerrar={() => {
          setModalPagoAbierto(false);
          limpiarAccionQuery();
        }}
        titulo={modalTitle("Registrar pago")}
        descripcion="Fase 3: forma de pago, fecha y observación."
        maxWidthClass="sm:max-w-[min(760px,calc(100vw-1rem))]"
      >
        <ModalPagoVenta
          abierto={modalPagoAbierto}
          venta={venta}
          onGuardado={onVentaActualizada}
          onCancelar={() => {
            setModalPagoAbierto(false);
            limpiarAccionQuery();
          }}
        />
      </VentanaModal>
    </section>
  );
}

function ResumenTabla({ rows = [], compact = false }) {
  return (
    <div className="divide-y divide-slate-200">
      {rows.map((row) => (
        <div
          key={row.label}
          className={`grid grid-cols-[minmax(150px,42%)_1fr] ${compact ? "px-4 py-3" : "px-4 py-3.5"}`}
        >
          <div className="flex items-center gap-2 pr-3 text-sm font-bold text-slate-900">
            {row.icon ? (
              <row.icon className={`h-4 w-4 ${row.iconClass || iconColor(row.icon)}`} />
            ) : null}
            <span>{row.label}:</span>
          </div>
          <div className="flex items-center text-sm font-medium text-slate-700 break-words">{row.value ?? "—"}</div>
        </div>
      ))}
    </div>
  );
}
