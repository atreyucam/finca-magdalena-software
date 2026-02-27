import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Sprout, Tractor, Layout, Map, Pencil, Inbox } from "lucide-react";
import { listarFincas, listarCosechas } from "../api/apiClient";
import { toast } from "sonner";

// UI Components
import Boton from "../components/ui/Boton";
import Badge from "../components/ui/Badge";
import VentanaModal from "../components/ui/VentanaModal";
import { Tabla, TablaCabecera, TablaHead, TablaCuerpo, TablaFila, TablaCelda } from "../components/ui/Tabla";
import useNotificacionesStore from "../store/notificacionesStore";

// Modales
import FormularioFinca from "../components/produccion/FormularioFinca";
import FormularioLote from "../components/produccion/FormularioLote";
import FormularioCosecha from "../components/produccion/FormularioCosecha";

export default function Produccion() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("lotes");
  const [fincas, setFincas] = useState([]);
  const [cosechas, setCosechas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalFinca, setModalFinca] = useState(false);
  const [modalLote, setModalLote] = useState(false);
  const [modalCosecha, setModalCosecha] = useState(false);
  const [mostrarArchivadas, setMostrarArchivadas] = useState(false);
  const [fincaEdit, setFincaEdit] = useState(null); // finca seleccionada para editar

  const cargarNotifs = useNotificacionesStore((s) => s.cargar);

const fincasVisibles = mostrarArchivadas
  ? fincas
  : fincas.filter(f => f.estado !== "Inactivo");


  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resF, resC] = await Promise.all([listarFincas(), listarCosechas()]);
      setFincas(resF.data || []);
      setCosechas(resC.data || []);
    } catch {
      toast.error("Error al sincronizar datos de producción");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        
        {/* 🟢 Header Seccional Ajustado para Responsive */}
        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="text-left">
            <h1 className="text-2xl font-bold text-slate-900">Infraestructura Agrícola</h1>
            <p className="text-sm text-slate-500 font-medium tracking-tight">Gestión unificada de propiedades y ciclos de pitahaya.</p>
          </div>
          
          {/* Botones alineados a la derecha en móvil/tablet con 'justify-end' y 'w-full' */}
          <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
            <Boton variante="fantasma" onClick={() => setModalFinca(true)} icono={Map}>Nueva Finca</Boton>
            <Boton onClick={() => tab === "lotes" ? setModalLote(true) : setModalCosecha(true)} icono={Plus}>
              {tab === "lotes" ? "Añadir Lote" : "Nueva Cosecha"}
            </Boton>
          </div>
        </div>
        <div className="flex items-center gap-2 mr-2">
  <button
    onClick={() => setMostrarArchivadas(v => !v)}
    className="text-xs font-bold px-3 mb-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
  >
    {mostrarArchivadas ? "Ocultar archivadas" : "Mostrar archivadas"}
  </button>
</div>


        {/* Control de Pestañas */}
        <div className="mb-8 flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
          <button onClick={() => setTab("lotes")} className={`px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${tab === "lotes" ? 'bg-white shadow-sm text-black' : 'text-slate-500 hover:text-slate-700'}`}>Visualización de Lotes</button>
          <button onClick={() => setTab("cosechas")} className={`px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${tab === "cosechas" ? 'bg-white shadow-sm text-black' : 'text-slate-500 hover:text-slate-700'}`}>Ciclos de Cosecha</button>
        </div>

        {!loading && fincas.length === 0 ? (
  <div className="py-20">
    <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-600">
        <Inbox size={22} />
      </div>

      <h2 className="text-lg font-black text-slate-900">Aún no tienes fincas registradas</h2>
      <p className="mt-2 text-sm text-slate-600">
        Crea tu primera finca para empezar a gestionar lotes y ciclos de cosecha.
      </p>

      <div className="mt-6 flex justify-center gap-2">
        <Boton onClick={() => setModalFinca(true)} icono={Map}>
          Crear primera finca
        </Boton>
      </div>
    </div>
  </div>
) : (
          <div className="space-y-16">
            {[...fincasVisibles].sort((a,b)=>Number(a.id)-Number(b.id)).map(finca => (
              <div key={finca.id} className="space-y-6">
<div className="flex items-center justify-between gap-3 border-b-2 border-slate-100 pb-3">
  <div className="flex items-center gap-3">
    <div className="h-10 w-10 flex items-center justify-center rounded-xl text-emerald-600">
      <Tractor size={30} />
    </div>

    <div className="flex flex-col justify-center">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
          {finca.nombre}
        </h2>

        <button
          type="button"
          title="Editar finca"
          className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600"
          onClick={() => {
            setFincaEdit(finca);
            setModalFinca(true);
          }}
        >
          <Pencil size={16} />
        </button>
      </div>

      <p className="text-xs font-bold text-slate-600 uppercase tracking-widest pb-1">
        {finca.hectareas_totales} Hectáreas totales
      </p>

      <p className="text-sm text-slate-500 flex items-center gap-2">
        <Badge variante={finca.estado === "Activo" ? "activo" : "inactivo"}>
          {finca.estado}
        </Badge>

        {finca.ubicacion ? `· Ubicación: ${finca.ubicacion}` : ""}
      </p>
    </div>
  </div>
</div>






                {tab === "lotes" ? (
                  <Tabla>
                    <TablaCabecera>
                      {/* <TablaHead>ID</TablaHead> */}
                      <TablaHead>Nombre del Lote</TablaHead>
                      <TablaHead>Superficie</TablaHead>
                      <TablaHead>N° Plantas</TablaHead>
                      <TablaHead>Estado</TablaHead>
                      <TablaHead align="center">Acciones</TablaHead>
                    </TablaCabecera>
                    <TablaCuerpo>
                      {finca.lotes?.length > 0 ? (
                        [...finca.lotes].sort((a, b) => Number(a.id) - Number(b.id)).map(l => (
                          <TablaFila key={l.id}>
                            {/* <TablaCelda className="text-xs font-mono text-slate-400">#{l.id}</TablaCelda> */}
                            <TablaCelda className="font-bold text-slate-900">{l.nombre}</TablaCelda>
                            <TablaCelda>{l.superficie_ha} ha</TablaCelda>
                            <TablaCelda className="font-mono">{l.numero_plantas}</TablaCelda>
                            <TablaCelda>
                              <Badge variante={l.estado === "Activo" ? "activo" : "inactivo"}>{l.estado}</Badge>
                            </TablaCelda>
                            <TablaCelda align="center">
                              <div className="flex justify-center">
                                <Boton variante="fantasma" 
                                className="!px-2 !py-1 text-xs font-bold border border-slate-200" 
                                onClick={() => navigate(`/owner/produccion/lotes/${l.id}`)}>
                                  Gestionar
                                </Boton>
                              </div>
                            </TablaCelda>
                          </TablaFila>
                        ))
                      ) : (
                        <TablaFila>
                          <TablaCelda colSpan={6} className="py-12 bg-white text-center">
                            <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                              <Inbox size={24} />
                              <span className="text-xs italic">Sin lotes asignados</span>
                            </div>
                          </TablaCelda>
                        </TablaFila>
                      )}
                    </TablaCuerpo>
                  </Tabla>
                ) : (
                  <Tabla>
                    <TablaCabecera>
                      <TablaHead>Cosecha / Código</TablaHead>
                      <TablaHead>Fecha Inicio</TablaHead>
                      <TablaHead>Fecha Fin</TablaHead>
                      <TablaHead>Ciclo Agrícola</TablaHead>
                      <TablaHead>Estado</TablaHead>
                      <TablaHead align="center">Acciones</TablaHead>
                    </TablaCabecera>
                    <TablaCuerpo>
                      {cosechas.filter(c => c.finca_id === finca.id).length > 0 ? (
                        cosechas
                          .filter(c => c.finca_id === finca.id)
                          .sort((a, b) => {
                            if (a.estado === b.estado) return 0;
                            if (a.estado === "Activa") return -1;
                            if (b.estado === "Activa") return 1;
                            return 0;
                          })
                          .map(c => (
                            <TablaFila key={c.id} className="bg-white"> 
                              <TablaCelda>
                                <div className="font-bold text-slate-800">{c.nombre}</div>
                                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">
                                  {c.codigo}
                                </div>
                              </TablaCelda>
                              <TablaCelda className="text-xs text-slate-600">{c.fecha_inicio}</TablaCelda>
                              <TablaCelda className="text-xs text-slate-600">{c.fecha_fin ?? " Sin registro "}</TablaCelda>
                              <TablaCelda className="text-xs font-semibold text-slate-700">{c.anio_agricola}</TablaCelda>
                              <TablaCelda>
                                <Badge variante={c.estado === "Activa" ? "activo" : "neutro"}>{c.estado}</Badge>
                              </TablaCelda>
                              <TablaCelda align="center">
                                <div className="flex justify-center ">
                                  <Boton 
                                    variante="fantasma" 
                                    className="!p-2 !py-1 flex text-xs items-center justify-center hover:bg-slate-100 rounded-lg transition-all" 
                                    onClick={() => navigate(`/owner/produccion/cosechas/${c.id}`)}
                                  >
                                    {/* <Settings2 size={18} className="shrink-0 text-slate-600" /> */}
                                    Gestionar
                                  </Boton>
                                </div>
                              </TablaCelda>
                            </TablaFila>
                          ))
                      ) : (
                        <TablaFila>
                          <TablaCelda colSpan={5} className="py-12 bg-white text-center">
                            <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                              <Inbox size={24} />
                              <span className="text-xs italic">Sin registros de cosecha</span>
                            </div>
                          </TablaCelda>
                        </TablaFila>
                      )}
                    </TablaCuerpo>
                  </Tabla>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modales */}
<VentanaModal
  abierto={modalFinca}
  cerrar={() => {
    setModalFinca(false);
    setFincaEdit(null);
  }}
  titulo={null}
>
  <FormularioFinca
    finca={fincaEdit}
    alCancelar={() => {
      setModalFinca(false);
      setFincaEdit(null);
    }}
    alGuardar={async () => {
      setModalFinca(false);
      setFincaEdit(null);
      await cargarDatos();
      await cargarNotifs();
    }}
  />
</VentanaModal>


      <VentanaModal
  abierto={modalLote}
  cerrar={() => setModalLote(false)}
  titulo={null
  }
>
  <FormularioLote
    fincas={fincas}
    alCancelar={() => setModalLote(false)}
    alGuardar={async () => {
      setModalLote(false);
      await cargarDatos();
      await cargarNotifs();
    }}
  />
</VentanaModal>

  <VentanaModal
  abierto={modalCosecha}
  cerrar={() => setModalCosecha(false)}
  titulo={null}
>
  <FormularioCosecha
    fincas={fincas}
    alCancelar={() => setModalCosecha(false)}
    alGuardar={async () => {
      setModalCosecha(false);
      await cargarDatos();
      await cargarNotifs();
    }}
  />
</VentanaModal>

    </section>
  );
}
