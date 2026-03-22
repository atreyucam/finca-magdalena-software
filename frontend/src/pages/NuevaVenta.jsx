import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Search, UserRound, XCircle } from "lucide-react";
import {
  crearEntregaVenta,
  listarLotes,
  obtenerDisponibilidadVentaLote,
} from "../api/apiClient";
import useToast from "../hooks/useToast";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Boton from "../components/ui/Boton";
import LinkVolver from "../components/ui/LinkVolver";
import VentanaModal from "../components/ui/VentanaModal";
import SelectorClienteVentaModal from "../components/ventas/SelectorClienteVentaModal";

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

export default function NuevaVenta() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const base = useMemo(
    () => `/${location.pathname.split("/")[1] || "owner"}`,
    [location.pathname]
  );

  const [form, setForm] = useState({
    cliente_id: "",
    fecha_entrega: todayYmd(),
    lote_id: "",
    tipo_venta: "EXPORTACION",
    gavetas_entregadas: "",
    observacion: "",
  });

  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const [lotes, setLotes] = useState([]);
  const [cargandoLotes, setCargandoLotes] = useState(false);

  const [disponibilidad, setDisponibilidad] = useState(null);
  const [cargandoDisponibilidad, setCargandoDisponibilidad] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [modalClienteAbierto, setModalClienteAbierto] = useState(false);

  const loteSeleccionado = useMemo(
    () => lotes.find((l) => String(l.id) === String(form.lote_id)),
    [lotes, form.lote_id]
  );

  const disponibleRelevante = useMemo(() => {
    if (!disponibilidad?.disponibilidad) return null;
    return form.tipo_venta === "EXPORTACION"
      ? disponibilidad.disponibilidad.exportacion_disponible
      : disponibilidad.disponibilidad.nacional_disponible;
  }, [disponibilidad, form.tipo_venta]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        setCargandoLotes(true);
        const res = await listarLotes();
        if (!active) return;
        const lista = Array.isArray(res?.data) ? res.data : [];
        setLotes(lista.filter((l) => String(l?.estado || "").toLowerCase() === "activo"));
      } catch (error) {
        if (!active) return;
        toast.error(error?.response?.data?.message || "No se pudo cargar lotes");
      } finally {
        if (active) setCargandoLotes(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [toast]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!form.lote_id) {
        setDisponibilidad(null);
        return;
      }

      try {
        setCargandoDisponibilidad(true);
        const res = await obtenerDisponibilidadVentaLote(form.lote_id);
        if (!active) return;
        setDisponibilidad(res?.data || null);
      } catch (error) {
        if (!active) return;
        setDisponibilidad(null);
        toast.error(error?.response?.data?.message || "No se pudo cargar disponibilidad del lote");
      } finally {
        if (active) setCargandoDisponibilidad(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [form.lote_id, toast]);

  const onChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const onClienteSeleccionado = (cliente) => {
    setModalClienteAbierto(false);
    if (cliente?.id) {
      setForm((prev) => ({ ...prev, cliente_id: String(cliente.id) }));
      setClienteSeleccionado(cliente);
    }
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!form.cliente_id) {
      toast.error("Debes seleccionar un cliente");
      return;
    }

    if (!form.lote_id) {
      toast.error("Debes seleccionar un lote");
      return;
    }

    const gavetas = Number(form.gavetas_entregadas);
    if (!Number.isFinite(gavetas) || gavetas <= 0) {
      toast.error("Gavetas entregadas debe ser mayor a 0");
      return;
    }

    const payload = {
      cliente_id: Number(form.cliente_id),
      fecha_entrega: form.fecha_entrega,
      lote_id: Number(form.lote_id),
      tipo_venta: form.tipo_venta,
      gavetas_entregadas: gavetas,
      observacion: String(form.observacion || "").trim() || null,
    };

    try {
      setGuardando(true);
      const res = await crearEntregaVenta(payload);
      toast.success("Entrega registrada en estado PENDIENTE");
      navigate(`${base}/ventas/${res?.data?.id}`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "No se pudo registrar la entrega");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
        <div className="mb-6">
          <LinkVolver to={`${base}/ventas`} label="Volver a ventas" />
        </div>

        <div className="mb-6 flex flex-col gap-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Nueva venta</h1>
          <p className="text-slate-500 font-medium">
            Fase 1: registra la entrega al cliente, por lote y tipo de venta.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Cliente seleccionado
              </p>

              <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-4">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <UserRound className="h-4 w-4" />
                    Cliente
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-slate-900">
                    {clienteSeleccionado?.nombre || "Aún no has seleccionado un cliente para esta venta."}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 lg:shrink-0">
                  <Boton type="button" variante="fantasma" onClick={() => setModalClienteAbierto(true)}>
                    <Search className="mr-2 h-4 w-4" />
                    Buscar cliente
                  </Boton>
                  <Boton
                    type="button"
                    variante="outlinePeligro"
                    disabled={!clienteSeleccionado}
                    onClick={() => {
                      setClienteSeleccionado(null);
                      setForm((prev) => ({ ...prev, cliente_id: "" }));
                    }}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Quitar cliente
                  </Boton>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Fecha de entrega *"
              type="date"
              value={form.fecha_entrega}
              onChange={onChange("fecha_entrega")}
              required
            />

            <Select
              label="Lote *"
              value={form.lote_id}
              onChange={onChange("lote_id")}
              required
              disabled={cargandoLotes}
            >
              <option value="">Selecciona lote</option>
              {lotes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre} {l?.finca?.nombre ? `- ${l.finca.nombre}` : ""}
                </option>
              ))}
            </Select>

            <Select
              label="Tipo de venta *"
              value={form.tipo_venta}
              onChange={onChange("tipo_venta")}
              required
            >
              <option value="EXPORTACION">EXPORTACION</option>
              <option value="NACIONAL">NACIONAL</option>
            </Select>

            <Input
              label="Gavetas entregadas *"
              type="number"
              min="1"
              step="1"
              value={form.gavetas_entregadas}
              onChange={onChange("gavetas_entregadas")}
              required
            />
          </div>

          <Input
            label="Observación"
            value={form.observacion}
            onChange={onChange("observacion")}
            placeholder="Opcional"
          />

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <p className="text-xs uppercase tracking-wide font-bold text-slate-500 mb-2">
              Contexto comercial del lote
            </p>

            {!form.lote_id ? (
              <p className="text-sm text-slate-600">Selecciona un lote para visualizar disponibilidad.</p>
            ) : cargandoDisponibilidad ? (
              <p className="text-sm text-slate-600">Calculando disponibilidad...</p>
            ) : disponibilidad?.disponibilidad ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <CardMetrica
                    label="Exportación disponible"
                    value={disponibilidad.disponibilidad.exportacion_disponible}
                    emphasis={form.tipo_venta === "EXPORTACION"}
                  />
                  <CardMetrica
                    label="Nacional disponible"
                    value={disponibilidad.disponibilidad.nacional_disponible}
                    emphasis={form.tipo_venta === "NACIONAL"}
                  />
                  <CardMetrica
                    label="Rechazo acumulado"
                    value={disponibilidad.disponibilidad.rechazo_acumulado}
                    emphasis={false}
                  />
                </div>

                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  Lote: <span className="font-semibold">{loteSeleccionado?.nombre || disponibilidad?.lote?.nombre || "—"}</span>
                  {disponibilidad?.lote?.finca?.nombre ? (
                    <>
                      {" "}- Finca: <span className="font-semibold">{disponibilidad.lote.finca.nombre}</span>
                    </>
                  ) : null}
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  Disponibilidad relevante para {form.tipo_venta}: <span className="font-black">{disponibleRelevante ?? 0}</span> gavetas.
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600">No fue posible obtener disponibilidad del lote.</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Boton type="button" variante="fantasma" onClick={() => navigate(`${base}/ventas`)} disabled={guardando}>
              Cancelar
            </Boton>
            <Boton tipo="submit" variante="primario" cargando={guardando}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar entrega
            </Boton>
          </div>
        </form>
      </div>

      <VentanaModal
        abierto={modalClienteAbierto}
        cerrar={() => setModalClienteAbierto(false)}
        maxWidthClass="sm:max-w-[min(1040px,calc(100vw-1rem))]"
      >
        <SelectorClienteVentaModal
          abierto={modalClienteAbierto}
          onCancelar={() => setModalClienteAbierto(false)}
          onSeleccionar={onClienteSeleccionado}
        />
      </VentanaModal>
    </section>
  );
}

function CardMetrica({ label, value, emphasis = false }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${emphasis ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}>
      <p className="text-[11px] uppercase tracking-wide font-bold text-slate-500">{label}</p>
      <p className={`text-xl font-black ${emphasis ? "text-emerald-700" : "text-slate-800"}`}>{value ?? 0}</p>
    </div>
  );
}
