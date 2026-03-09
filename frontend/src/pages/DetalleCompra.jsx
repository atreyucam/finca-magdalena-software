import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FileText } from "lucide-react";
import { obtenerCompra } from "../api/apiClient";
import useToast from "../hooks/useToast";
import LinkVolver from "../components/ui/LinkVolver";
import Badge from "../components/ui/Badge";
import {
  Tabla,
  TablaCabecera,
  TablaHead,
  TablaCuerpo,
  TablaFila,
  TablaCelda,
  TablaVacia,
} from "../components/ui/Tabla";

function fmtMoney(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

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

export default function DetalleCompra() {
  const { id } = useParams();
  const toast = useToast();

  const [cargando, setCargando] = useState(true);
  const [compra, setCompra] = useState(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        setCargando(true);
        const res = await obtenerCompra(id);
        if (!active) return;
        setCompra(res?.data || null);
      } catch (error) {
        toast.error(error?.response?.data?.message || "No se pudo cargar el detalle de compra");
      } finally {
        if (active) setCargando(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [id, toast]);

  const detalles = useMemo(
    () => (Array.isArray(compra?.detalles) ? compra.detalles : []),
    [compra]
  );

  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        <div className="mb-6">
          <LinkVolver to="/owner/compras" label="Volver a compras" />
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <FileText size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Detalle de compra</h1>
              <p className="text-slate-500 font-medium">
                Factura: <span className="font-semibold">{compra?.numero_factura || "—"}</span>
              </p>
            </div>
          </div>
          {compra?.estado ? <Badge variante="confirmada">{compra.estado}</Badge> : null}
        </div>

        {cargando ? (
          <div className="rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
            Cargando detalle...
          </div>
        ) : !compra ? (
          <div className="rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
            No se encontró la compra solicitada.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <CardDato label="Factura" value={compra.numero_factura} />
              <CardDato label="Fecha" value={fmtDate(compra.fecha_compra)} />
              <CardDato label="Proveedor" value={compra.proveedor?.nombre || "—"} />
              <CardDato
                label="Registrado por"
                value={compra.creado_por?.nombre || "—"}
              />
              <CardDato label="Subtotal" value={fmtMoney(compra.subtotal)} />
              <CardDato label="Total" value={fmtMoney(compra.total)} strong />
              <CardDato label="RUC proveedor" value={compra.proveedor?.ruc || "—"} />
              <CardDato label="Estado" value={compra.estado} />
            </div>

            {compra.observacion ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide font-bold text-slate-500">Observacion</p>
                <p className="mt-1 text-sm text-slate-700">{compra.observacion}</p>
              </div>
            ) : null}

            <Tabla>
              <TablaCabecera>
                <TablaHead>Item</TablaHead>
                <TablaHead>Categoria</TablaHead>
                <TablaHead>Unidad</TablaHead>
                <TablaHead align="right">Cantidad</TablaHead>
                <TablaHead align="right">Costo unitario</TablaHead>
                <TablaHead align="right">Subtotal</TablaHead>
              </TablaCabecera>
              <TablaCuerpo>
                {detalles.length === 0 ? (
                  <TablaVacia mensaje="Esta compra no tiene detalle cargado." colSpan={6} />
                ) : (
                  detalles.map((d) => (
                    <TablaFila key={d.id}>
                      <TablaCelda className="font-semibold text-slate-800">
                        {d.item?.nombre || "—"}
                      </TablaCelda>
                      <TablaCelda>{d.item?.categoria || "—"}</TablaCelda>
                      <TablaCelda>{d.item?.unidad?.codigo || "—"}</TablaCelda>
                      <TablaCelda align="right" className="font-mono">
                        {d.cantidad}
                      </TablaCelda>
                      <TablaCelda align="right" className="font-mono">
                        {fmtMoney(d.costo_unitario)}
                      </TablaCelda>
                      <TablaCelda align="right" className="font-mono font-bold text-slate-900">
                        {fmtMoney(d.subtotal)}
                      </TablaCelda>
                    </TablaFila>
                  ))
                )}
              </TablaCuerpo>
            </Tabla>
          </div>
        )}
      </div>
    </section>
  );
}

function CardDato({ label, value, strong = false }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider font-bold text-slate-500">{label}</p>
      <p className={`mt-1 text-sm ${strong ? "font-black text-slate-900" : "font-semibold text-slate-800"}`}>
        {value || "—"}
      </p>
    </div>
  );
}
