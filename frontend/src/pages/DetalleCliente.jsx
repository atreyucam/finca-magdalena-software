import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Eye,
  Mail,
  MapPin,
  Phone,
  Trash2,
  UserX,
} from "lucide-react";
import { desactivarCliente, eliminarCliente, listarVentas, obtenerCliente } from "../api/apiClient";
import useListado from "../hooks/useListado";
import useToast from "../hooks/useToast";
import PageIntro from "../components/app/PageIntro";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Boton from "../components/ui/Boton";
import Badge from "../components/ui/Badge";
import Paginador from "../components/ui/Paginador";
import VentanaModal from "../components/ui/VentanaModal";
import {
  Tabla,
  TablaCabecera,
  TablaHead,
  TablaCuerpo,
  TablaFila,
  TablaCelda,
  TablaVacia,
} from "../components/ui/Tabla";

function ResumenTabla({ rows = [] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="divide-y divide-slate-200">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[minmax(140px,44%)_1fr] px-4 py-3.5"
          >
            <div className="flex items-center gap-2 pr-3 text-sm font-bold text-slate-900">
              {row.icon ? <row.icon className={`h-4 w-4 ${row.iconClass || "text-slate-500"}`} /> : null}
              <span>{row.label}:</span>
            </div>
            <div className="flex items-center text-sm font-medium text-slate-700 break-words">
              {row.value || "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-EC");
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

function badgeEstado(estado) {
  const raw = String(estado || "").toUpperCase();
  if (raw === "PENDIENTE") return { label: "Pendiente", variant: "pendiente" };
  if (raw === "LIQUIDADA") return { label: "Liquidada", variant: "liquidada" };
  if (raw === "PAGADA") return { label: "Pagada", variant: "pagada" };
  if (raw === "CANCELADA") return { label: "Cancelada", variant: "cancelada" };
  return { label: titleCaseLabel(estado), variant: "default" };
}

export default function DetalleCliente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const base = useMemo(
    () => `/${location.pathname.split("/")[1] || "owner"}`,
    [location.pathname]
  );

  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [procesandoAccion, setProcesandoAccion] = useState(false);

  const {
    datos: ventas,
    cargando: cargandoVentas,
    pagina,
    setPagina,
    totalPaginas,
    totalRegistros,
    filtros,
    actualizarFiltro,
  } = useListado(listarVentas, {
    cliente_id: id,
    estado: "",
    desde: "",
    hasta: "",
    pageSize: 10,
  });

  const listaVentas = useMemo(() => (Array.isArray(ventas) ? ventas : []), [ventas]);
  const accionDestructiva =
    cliente?.activo && cliente?.puede_eliminar
      ? "eliminar"
      : cliente?.activo && cliente?.puede_desactivar
        ? "desactivar"
        : null;

  const cargarCliente = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await obtenerCliente(id);
      setCliente(res?.data || res);
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo cargar el cliente");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const res = await obtenerCliente(id);
        if (!active) return;
        setCliente(res?.data || res);
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || "No se pudo cargar el cliente");
      } finally {
        if (active) setLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [id]);

  const ejecutarAccionDestructiva = async () => {
    if (!cliente?.id || !accionDestructiva) return;

    try {
      setProcesandoAccion(true);
      if (accionDestructiva === "eliminar") {
        await eliminarCliente(cliente.id);
        toast.success("Cliente eliminado");
        navigate(`${base}/ventas/clientes`);
        return;
      }

      await desactivarCliente(cliente.id);
      toast.success("Cliente desactivado");
      setConfirmOpen(false);
      await cargarCliente();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          (accionDestructiva === "eliminar"
            ? "No se pudo eliminar el cliente"
            : "No se pudo desactivar el cliente")
      );
    } finally {
      setProcesandoAccion(false);
    }
  };

  return (
    <section className="-m-4 min-h-screen bg-slate-50 p-4 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
      <div className="mx-auto max-w-[1400px]">
        <button
          onClick={() => navigate(`${base}/ventas/clientes`)}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a clientes
        </button>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : !cliente ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm font-medium text-slate-600">
              Cliente no encontrado.
            </div>
          ) : (
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-3">
                    <PageIntro
                      title="Cliente"
                      subtitle="Registro utilizado dentro del módulo de ventas."
                    />
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-slate-500">
                        ID cliente: {cliente.id}
                      </div>
                      <div className="text-3xl font-bold tracking-tight text-slate-900">
                        {cliente.nombre || "Cliente sin nombre"}
                      </div>
                    </div>
                  </div>
                  {accionDestructiva ? (
                    <Boton
                      type="button"
                      variante="outlinePeligro"
                      onClick={() => setConfirmOpen(true)}
                    >
                      {accionDestructiva === "eliminar" ? (
                        <Trash2 className="mr-2 h-4 w-4" />
                      ) : (
                        <UserX className="mr-2 h-4 w-4" />
                      )}
                      {accionDestructiva === "eliminar" ? "Eliminar cliente" : "Desactivar cliente"}
                    </Boton>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ResumenTabla
                  rows={[
                    { icon: Building2, label: "RUC", value: cliente.identificacion, iconClass: "text-slate-500" },
                    { icon: Phone, label: "Teléfono", value: cliente.telefono, iconClass: "text-slate-500" },
                  ]}
                />
                <ResumenTabla
                  rows={[
                    { icon: Mail, label: "Email", value: cliente.correo, iconClass: "text-slate-500" },
                    { icon: MapPin, label: "Dirección", value: cliente.direccion, iconClass: "text-slate-500" },
                  ]}
                />
              </div>

              <div className="space-y-6">
                <PageIntro
                  title="Facturas del cliente"
                  subtitle="Historial de ventas registradas a este cliente."
                />

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Select
                    label="Estado"
                    value={filtros.estado}
                    onChange={(e) => actualizarFiltro("estado", e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="LIQUIDADA">Liquidada</option>
                    <option value="PAGADA">Pagada</option>
                    <option value="CANCELADA">Cancelada</option>
                  </Select>
                  <Input
                    label="Desde"
                    type="date"
                    value={filtros.desde}
                    onChange={(e) => actualizarFiltro("desde", e.target.value)}
                  />
                  <Input
                    label="Hasta"
                    type="date"
                    value={filtros.hasta}
                    onChange={(e) => actualizarFiltro("hasta", e.target.value)}
                  />
                </div>

                <Tabla>
                  <TablaCabecera>
                    <TablaHead className="w-16">N°</TablaHead>
                    <TablaHead>Factura</TablaHead>
                    <TablaHead>Fecha entrega</TablaHead>
                    <TablaHead>N° recibo</TablaHead>
                    <TablaHead>Tipo</TablaHead>
                    <TablaHead align="right">Total</TablaHead>
                    <TablaHead align="center">Estado</TablaHead>
                    <TablaHead align="right">Acciones</TablaHead>
                  </TablaCabecera>

                  <TablaCuerpo>
                    {cargandoVentas ? (
                      [...Array(6)].map((_, idx) => (
                        <TablaFila key={idx}>
                          <TablaCelda colSpan={8} className="py-6">
                            <div className="h-4 animate-pulse rounded bg-slate-100" />
                          </TablaCelda>
                        </TablaFila>
                      ))
                    ) : listaVentas.length === 0 ? (
                      <TablaVacia mensaje="No hay facturas para este cliente." colSpan={8} />
                    ) : (
                      listaVentas.map((venta, idx) => {
                        const estado = badgeEstado(venta.estado);
                        return (
                          <TablaFila key={venta.id}>
                            <TablaCelda className="font-mono text-xs text-slate-500">
                              {(pagina - 1) * 10 + idx + 1}
                            </TablaCelda>
                            <TablaCelda className="font-semibold text-slate-800">
                              {venta.numero_factura || "—"}
                            </TablaCelda>
                            <TablaCelda>{fmtDate(venta.fecha_entrega)}</TablaCelda>
                            <TablaCelda>{venta.numero_recibo || "—"}</TablaCelda>
                            <TablaCelda>{titleCaseLabel(venta.tipo_venta)}</TablaCelda>
                            <TablaCelda align="right" className="font-mono font-semibold">
                              {fmtMoney(venta.total)}
                            </TablaCelda>
                            <TablaCelda align="center">
                              <Badge variante={estado.variant}>{estado.label}</Badge>
                            </TablaCelda>
                            <TablaCelda align="right">
                              <Boton
                                variante="fantasma"
                                className="!px-3 !py-1.5 text-xs border-slate-200"
                                onClick={() => navigate(`${base}/ventas/${venta.id}`)}
                              >
                                <Eye size={14} className="mr-1.5" />
                                Ver detalle
                              </Boton>
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
                  onCambiarPagina={setPagina}
                  totalRegistros={totalRegistros}
                  mostrarSiempre
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <VentanaModal
        abierto={confirmOpen}
        cerrar={() => (procesandoAccion ? null : setConfirmOpen(false))}
        titulo={accionDestructiva === "eliminar" ? "Eliminar cliente" : "Desactivar cliente"}
        descripcion={
          accionDestructiva === "eliminar"
            ? "Este cliente no tiene facturas registradas y se eliminará de forma permanente."
            : "Este cliente tiene facturas registradas y quedará inactivo para nuevos usos."
        }
        maxWidthClass="sm:max-w-[min(520px,calc(100vw-1rem))]"
      >
        <div className="space-y-5 px-4 py-5 sm:px-6">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {accionDestructiva === "eliminar"
              ? "¿Seguro que quieres eliminar este cliente?"
              : "¿Seguro que quieres desactivar este cliente?"}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
            <Boton
              type="button"
              variante="fantasma"
              onClick={() => setConfirmOpen(false)}
              disabled={procesandoAccion}
            >
              Cancelar
            </Boton>
            <Boton
              type="button"
              variante="outlinePeligro"
              onClick={ejecutarAccionDestructiva}
              cargando={procesandoAccion}
            >
              {accionDestructiva === "eliminar" ? "Sí, eliminar" : "Sí, desactivar"}
            </Boton>
          </div>
        </div>
      </VentanaModal>
    </section>
  );
}
