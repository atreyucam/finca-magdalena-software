import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { ReceiptText, Wallet } from "lucide-react";
import { obtenerVenta } from "../api/apiClient";
import useToast from "../hooks/useToast";
import useAuthStore from "../store/authStore";
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
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Detalle de venta</h1>
                <p className="text-slate-500 font-medium">
                  Factura: <span className="font-semibold text-slate-800">{venta.numero_factura}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variante={venta.estado}>{venta.estado}</Badge>
                {isOwner && venta.estado === "PENDIENTE" && (
                  <Boton
                    variante="outlineAlerta"
                    onClick={() => setModalLiquidacionAbierto(true)}
                  >
                    <ReceiptText className="mr-2 h-4 w-4" />
                    Registrar liquidación
                  </Boton>
                )}
                {isOwner && venta.estado === "LIQUIDADA" && (
                  <Boton
                    variante="outlineExito"
                    onClick={() => setModalPagoAbierto(true)}
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    Registrar pago
                  </Boton>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <CardDato label="Factura" value={venta.numero_factura} />
              <CardDato label="Cliente" value={venta.cliente?.nombre || "—"} />
              <CardDato label="Fecha entrega" value={fmtDate(venta.fecha_entrega)} />
              <CardDato label="Lote" value={venta.lote?.nombre || "—"} />
              <CardDato label="Tipo" value={venta.tipo_venta} />
              <CardDato label="Estado" value={venta.estado} />
              <CardDato label="N° recibo" value={venta.numero_recibo || "—"} />
              <CardDato label="Forma de pago" value={venta.forma_pago || "—"} />
            </div>

            <Bloque titulo="Entrega">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <CardDato label="Gavetas entregadas" value={venta.gavetas_entregadas} strong />
                <CardDato label="Observación" value={venta.observacion || "—"} />
                <CardDato
                  label="Registrado por"
                  value={venta.creado_por?.nombre || "—"}
                />
              </div>
            </Bloque>

            <Bloque titulo="Liquidación">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <CardDato label="Gavetas devueltas" value={venta.gavetas_devueltas ?? "—"} />
                <CardDato label="Gavetas útiles" value={venta.gavetas_utiles ?? "—"} />
                <CardDato label="Subtotal" value={fmtMoney(venta.subtotal)} />
                <CardDato label="Total" value={fmtMoney(venta.total)} strong />
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
                          {d.clase_label || d.clase}
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

              {venta.reclasificacion ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Reclasificación aplicada: <span className="font-semibold">{venta.reclasificacion.descripcion}</span>
                  {" "}({venta.reclasificacion.gavetas} gavetas).
                </div>
              ) : null}
            </Bloque>

            <Bloque titulo="Pago">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <CardDato label="Forma de pago" value={venta.forma_pago || "—"} />
                <CardDato label="Fecha de pago" value={fmtDate(venta.fecha_pago)} />
                <CardDato label="Observación pago" value={venta.observacion_pago || "—"} />
              </div>
            </Bloque>

            {venta.disponibilidad_lote ? (
              <Bloque titulo="Disponibilidad actual lote">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <CardDato
                    label="Exportación disponible"
                    value={venta.disponibilidad_lote.exportacion_disponible}
                  />
                  <CardDato
                    label="Nacional disponible"
                    value={venta.disponibilidad_lote.nacional_disponible}
                  />
                  <CardDato
                    label="Rechazo acumulado"
                    value={venta.disponibilidad_lote.rechazo_acumulado}
                  />
                </div>
              </Bloque>
            ) : null}
          </div>
        )}
      </div>

      <VentanaModal
        abierto={modalLiquidacionAbierto}
        cerrar={() => {
          setModalLiquidacionAbierto(false);
          limpiarAccionQuery();
        }}
        titulo="Registrar liquidación"
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
        titulo="Registrar pago"
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

function Bloque({ titulo, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
      <h2 className="text-base font-black text-slate-900 mb-3">{titulo}</h2>
      {children}
    </div>
  );
}

function CardDato({ label, value, strong = false }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider font-bold text-slate-500">{label}</p>
      <p className={`mt-1 text-sm ${strong ? "font-black text-slate-900" : "font-semibold text-slate-800"}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}
