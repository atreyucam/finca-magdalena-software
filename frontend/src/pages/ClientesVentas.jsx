import { useMemo } from "react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, Pencil, Search, UserPlus } from "lucide-react";
import { listarClientes, obtenerCliente } from "../api/apiClient";
import useListado from "../hooks/useListado";
import useToast from "../hooks/useToast";
import PageIntro from "../components/app/PageIntro";
import Input from "../components/ui/Input";
import Boton from "../components/ui/Boton";
import Paginador from "../components/ui/Paginador";
import VentanaModal from "../components/ui/VentanaModal";
import FormularioClienteRapido from "../components/ventas/FormularioClienteRapido";
import {
  Tabla,
  TablaCabecera,
  TablaHead,
  TablaCuerpo,
  TablaFila,
  TablaCelda,
  TablaVacia,
} from "../components/ui/Tabla";

export default function ClientesVentas() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [modalClienteAbierto, setModalClienteAbierto] = useState(false);
  const [modoModal, setModoModal] = useState("crear");
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [cargandoModal, setCargandoModal] = useState(false);
  const base = useMemo(
    () => `/${location.pathname.split("/")[1] || "owner"}`,
    [location.pathname]
  );

  const {
    datos: clientes,
    cargando,
    pagina,
    setPagina,
    totalPaginas,
    totalRegistros,
    filtros,
    actualizarFiltro,
    recargar,
  } = useListado(listarClientes, {
    q: "",
    pageSize: 15,
  });

  const lista = Array.isArray(clientes) ? clientes : [];

  const abrirCrearCliente = () => {
    setModoModal("crear");
    setClienteSeleccionado(null);
    setModalClienteAbierto(true);
  };

  const abrirEditarCliente = async (id) => {
    try {
      setCargandoModal(true);
      setModoModal("editar");
      setModalClienteAbierto(true);
      const res = await obtenerCliente(id);
      setClienteSeleccionado(res?.data || res);
    } catch (error) {
      setModalClienteAbierto(false);
      setClienteSeleccionado(null);
      toast.error(error?.response?.data?.message || "No se pudo cargar el cliente");
    } finally {
      setCargandoModal(false);
    }
  };

  const onClienteGuardado = async () => {
    setModalClienteAbierto(false);
    setClienteSeleccionado(null);
    await recargar();
  };

  return (
    <section className="-m-4 min-h-screen bg-slate-50 p-4 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
      <div className="mx-auto max-w-[1400px] rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-3">
          <PageIntro
            title="Clientes"
            subtitle="Registro de clientes comerciales vinculados al flujo de ventas."
            className="mb-0"
            actions={
              <Boton type="button" onClick={abrirCrearCliente}>
                <UserPlus className="mr-2 h-4 w-4" />
                Agregar cliente
              </Boton>
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-3 mb-6 md:grid-cols-[minmax(0,440px)]">
          <Input
            icono={Search}
            label="Buscar"
            placeholder="Nombre, RUC, teléfono..."
            value={filtros.q}
            onChange={(e) => actualizarFiltro("q", e.target.value)}
          />
        </div>

        <Tabla>
          <TablaCabecera>
            <TablaHead className="w-20">ID</TablaHead>
            <TablaHead>Nombre</TablaHead>
            <TablaHead>RUC</TablaHead>
            <TablaHead>Teléfono</TablaHead>
            <TablaHead>Dirección</TablaHead>
            <TablaHead align="right">Acciones</TablaHead>
          </TablaCabecera>

          <TablaCuerpo>
            {cargando ? (
              [...Array(6)].map((_, idx) => (
                <TablaFila key={idx}>
                  <TablaCelda colSpan={6} className="py-6">
                    <div className="h-4 animate-pulse rounded bg-slate-100" />
                  </TablaCelda>
                </TablaFila>
              ))
            ) : lista.length === 0 ? (
              <TablaVacia mensaje="No hay clientes registrados." colSpan={6} />
            ) : (
              lista.map((cliente) => (
                <TablaFila key={cliente.id}>
                  <TablaCelda className="font-mono text-xs text-slate-500">
                    {cliente.id}
                  </TablaCelda>
                  <TablaCelda className="font-semibold text-slate-800">
                    {cliente.nombre || "—"}
                  </TablaCelda>
                  <TablaCelda>{cliente.identificacion || "—"}</TablaCelda>
                  <TablaCelda>{cliente.telefono || "—"}</TablaCelda>
                  <TablaCelda className="max-w-[320px] truncate" nowrap={false}>
                    {cliente.direccion || "—"}
                  </TablaCelda>
                  <TablaCelda align="right">
                    <div className="flex justify-end gap-2">
                      <Boton
                        variante="fantasma"
                        className="!px-3 !py-1.5 text-xs border-slate-200"
                        onClick={() => navigate(`${base}/ventas/clientes/${cliente.id}`)}
                      >
                        <Eye size={14} className="mr-1.5" />
                        Ver
                      </Boton>
                      <Boton
                        variante="fantasma"
                        className="!px-3 !py-1.5 text-xs border-slate-200"
                        onClick={() => abrirEditarCliente(cliente.id)}
                      >
                        <Pencil size={14} className="mr-1.5" />
                        Editar
                      </Boton>
                    </div>
                  </TablaCelda>
                </TablaFila>
              ))
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

      <VentanaModal
        abierto={modalClienteAbierto}
        cerrar={() => {
          setModalClienteAbierto(false);
          setClienteSeleccionado(null);
          setCargandoModal(false);
        }}
        maxWidthClass="sm:max-w-[min(840px,calc(100vw-1rem))]"
      >
        {cargandoModal ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : (
          <FormularioClienteRapido
            modo={modoModal}
            cliente={clienteSeleccionado}
            alCancelar={() => {
              setModalClienteAbierto(false);
              setClienteSeleccionado(null);
              setCargandoModal(false);
            }}
            alCreado={onClienteGuardado}
          />
        )}
      </VentanaModal>
    </section>
  );
}
