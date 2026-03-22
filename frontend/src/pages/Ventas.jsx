import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, Plus, ReceiptText, Wallet } from "lucide-react";
import { listarClientes, listarVentas } from "../api/apiClient";
import useListado from "../hooks/useListado";
import useToast from "../hooks/useToast";
import useAuthStore from "../store/authStore";
import PageIntro from "../components/app/PageIntro";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Boton from "../components/ui/Boton";
import Badge from "../components/ui/Badge";
import Paginador from "../components/ui/Paginador";
import {
  Tabla,
  TablaCabecera,
  TablaHead,
  TablaCuerpo,
  TablaFila,
  TablaCelda,
  TablaVacia,
} from "../components/ui/Tabla";

function monthYmd() {
  return new Date().toISOString().slice(0, 7);
}

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-EC");
}

export default function Ventas() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const role = useAuthStore((s) => s.getRole()) || "";
  const canCreate = ["Propietario", "Tecnico"].includes(role);
  const isOwner = role === "Propietario";

  const base = useMemo(
    () => `/${location.pathname.split("/")[1] || "owner"}`,
    [location.pathname]
  );

  const {
    datos: ventas,
    cargando,
    pagina,
    setPagina,
    totalPaginas,
    totalRegistros,
    filtros,
    actualizarFiltro,
  } = useListado(listarVentas, {
    q: "",
    cliente_id: "",
    mes: monthYmd(),
    estado: "",
    pageSize: 15,
  });

  const [clientes, setClientes] = useState([]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const res = await listarClientes({ pageSize: 200, activos: true });
        if (!active) return;
        setClientes(Array.isArray(res?.data?.data) ? res.data.data : []);
      } catch (error) {
        if (!active) return;
        toast.error(error?.response?.data?.message || "No se pudo cargar clientes para filtros");
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [toast]);

  const lista = useMemo(() => (Array.isArray(ventas) ? ventas : []), [ventas]);

  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px] rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        <PageIntro
          title="Ventas"
          subtitle="Flujo comercial por fases: entrega, liquidación y pago."
          className="mb-6"
          actions={
            canCreate ? (
              <Boton onClick={() => navigate(`${base}/ventas/nueva`)} icono={Plus}>
                Nueva venta
              </Boton>
            ) : null
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <Input
            label="Buscar"
            placeholder="Factura, recibo, cliente, lote..."
            value={filtros.q}
            onChange={(e) => actualizarFiltro("q", e.target.value)}
          />

          <Select
            label="Cliente"
            value={filtros.cliente_id}
            onChange={(e) => actualizarFiltro("cliente_id", e.target.value)}
          >
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>

          <Input
            label="Mes"
            type="month"
            value={filtros.mes}
            onChange={(e) => actualizarFiltro("mes", e.target.value)}
          />

          <Select
            label="Estado"
            value={filtros.estado}
            onChange={(e) => actualizarFiltro("estado", e.target.value)}
          >
            <option value="">Todos</option>
            <option value="PENDIENTE">PENDIENTE</option>
            <option value="LIQUIDADA">LIQUIDADA</option>
            <option value="PAGADA">PAGADA</option>
          </Select>
        </div>

        <Tabla>
          <TablaCabecera>
            <TablaHead className="w-16">N°</TablaHead>
            <TablaHead>Factura</TablaHead>
            <TablaHead>Cliente</TablaHead>
            <TablaHead>Fecha entrega</TablaHead>
            <TablaHead>Lote</TablaHead>
            <TablaHead>Tipo</TablaHead>
            <TablaHead align="right">Gavetas entregadas</TablaHead>
            <TablaHead align="center">Estado</TablaHead>
            <TablaHead align="right">Acciones</TablaHead>
          </TablaCabecera>

          <TablaCuerpo>
            {cargando ? (
              [...Array(6)].map((_, i) => (
                <TablaFila key={i}>
                  <TablaCelda colSpan={9} className="py-6">
                    <div className="h-4 bg-slate-100 rounded animate-pulse" />
                  </TablaCelda>
                </TablaFila>
              ))
            ) : lista.length === 0 ? (
              <TablaVacia mensaje="No hay ventas registradas." colSpan={9} />
            ) : (
              lista.map((v, idx) => {
                const canLiquidar = isOwner && v.estado === "PENDIENTE";
                const canPagar = isOwner && v.estado === "LIQUIDADA";

                return (
                  <TablaFila key={v.id}>
                    <TablaCelda className="font-mono text-xs text-slate-500">
                      {(pagina - 1) * 15 + idx + 1}
                    </TablaCelda>
                    <TablaCelda className="font-semibold text-slate-800">{v.numero_factura}</TablaCelda>
                    <TablaCelda>{v.cliente?.nombre || "—"}</TablaCelda>
                    <TablaCelda>{fmtDate(v.fecha_entrega)}</TablaCelda>
                    <TablaCelda>{v.lote?.nombre || "—"}</TablaCelda>
                    <TablaCelda>{v.tipo_venta}</TablaCelda>
                    <TablaCelda align="right" className="font-mono font-semibold">
                      {v.gavetas_entregadas}
                    </TablaCelda>
                    <TablaCelda align="center">
                      <Badge variante={v.estado}>{v.estado}</Badge>
                    </TablaCelda>
                    <TablaCelda align="right">
                      <div className="flex justify-end flex-wrap gap-2">
                        <Boton
                          variante="fantasma"
                          className="!px-3 !py-1.5 text-xs border-slate-200"
                          onClick={() => navigate(`${base}/ventas/${v.id}`)}
                        >
                          <Eye size={14} className="mr-1.5" />
                          Ver detalle
                        </Boton>

                        {canLiquidar && (
                          <Boton
                            variante="fantasma"
                            className="!px-3 !py-1.5 text-xs border-amber-200 text-amber-700"
                            onClick={() => navigate(`${base}/ventas/${v.id}?accion=liquidar`)}
                          >
                            <ReceiptText size={14} className="mr-1.5" />
                            Liquidar
                          </Boton>
                        )}

                        {canPagar && (
                          <Boton
                            variante="fantasma"
                            className="!px-3 !py-1.5 text-xs border-emerald-200 text-emerald-700"
                            onClick={() => navigate(`${base}/ventas/${v.id}?accion=pagar`)}
                          >
                            <Wallet size={14} className="mr-1.5" />
                            Pagar
                          </Boton>
                        )}
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
          onCambiarPagina={setPagina}
          totalRegistros={totalRegistros}
          mostrarSiempre={true}
        />
      </div>
    </section>
  );
}
