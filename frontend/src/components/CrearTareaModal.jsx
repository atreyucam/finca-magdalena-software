import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
  crearTarea, listarFincas, obtenerContextoFinca, listarUsuarios, listarTiposActividad, listarItemsInventario,
} from "../api/apiClient";
import VentanaModal from "./ui/VentanaModal";
import Boton from "./ui/Boton";
import Input from "./ui/Input";
import Select from "./ui/Select";
import FormularioDetalleActividad from "./FormularioDetalleActividad";
import SelectUsuariosChecklist from "./SelectUsuariosChecklist";
import { 
  Calendar, MapPin, Tag, Package, Search, Plus, Trash2, 
  AlertCircle, Sprout, ClipboardList, Tractor 
} from "lucide-react";

export default function CrearTareaModal({ open, onClose, onCreated }) {
  // Estados de carga inicial
  const [fincas, setFincas] = useState([]);
  const [tiposActividad, setTiposActividad] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  
  // Estados dinámicos según selección de Finca
  const [lotes, setLotes] = useState([]);
  const [cosechaActiva, setCosechaActiva] = useState(null);
  const [periodos, setPeriodos] = useState([]);

  // Estados de UI/Recursos
  const [tabRecursos, setTabRecursos] = useState("Insumo");
  const [busquedaRecurso, setBusquedaRecurso] = useState("");
  const [inventario, setInventario] = useState([]);
  const [recursosSel, setRecursosSel] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingContexto, setLoadingContexto] = useState(false);

  // Formulario
  const [form, setForm] = useState({
    finca_id: "", // Nuevo campo obligatorio para UX
    cosecha_id: "", 
    periodo_id: "", 
    lote_id: "", 
    tipo_codigo: "", 
    titulo: "", 
    descripcion: "",
    fecha_programada: new Date().toISOString().slice(0, 16), 
    asignados: [],
  });
  
  const [detalle, setDetalle] = useState({});

  // 1. Cargar datos globales al abrir
  useEffect(() => {
    if (open) { 
      resetForm(); 
      cargarCatalogosGlobales(); 
      cargarInventario("Insumo");
    }
  }, [open]);

  // 2. Cargar Contexto cuando cambia la Finca
  useEffect(() => {
    if (!form.finca_id) {
        setLotes([]);
        setCosechaActiva(null);
        setPeriodos([]);
        return;
    }

    const cargarContexto = async () => {
        setLoadingContexto(true);
        try {
            // Usamos el endpoint inteligente del backend
            const res = await obtenerContextoFinca(form.finca_id);
            const { lotes, cosechaActiva } = res.data;
            
            setLotes(lotes || []);
            setCosechaActiva(cosechaActiva);
            
            // Auto-seleccionar cosecha si existe
            if (cosechaActiva) {
                setForm(prev => ({ ...prev, cosecha_id: String(cosechaActiva.id) }));
                setPeriodos(cosechaActiva.PeriodoCosechas || []);
            } else {
                toast.error("⚠️ Esta finca no tiene una Cosecha Activa.");
                setForm(prev => ({ ...prev, cosecha_id: "" }));
            }
        } catch (error) {
            console.error(error);
            toast.error("Error cargando lotes de la finca");
        } finally {
            setLoadingContexto(false);
        }
    };
    cargarContexto();
  }, [form.finca_id]);

  // 3. Resetear detalle al cambiar actividad
  useEffect(() => { setDetalle({}); }, [form.tipo_codigo]);

  // 4. Cargar inventario al cambiar tab
  useEffect(() => { if(open) cargarInventario(tabRecursos); }, [tabRecursos]);

  const cargarCatalogosGlobales = async () => {
    try {
      const [fRes, tRes, uRes] = await Promise.all([
        listarFincas(),
        listarTiposActividad(), 
        listarUsuarios({ estado: "Activo", pageSize: 100 }),
      ]);
      setFincas(fRes.data || []);
      setTiposActividad(tRes.data || []);
      const users = (uRes.data?.data || []).filter((u) => ["Trabajador", "Tecnico"].includes(u.role));
      setUsuarios(users);
    } catch (err) { toast.error("Error cargando datos iniciales"); }
  };

  const cargarInventario = async (categoria) => {
    try {
      const res = await listarItemsInventario({ categoria, activos: true });
      setInventario(res.data || []);
    } catch (err) { console.error(err); }
  };

  const resetForm = () => {
    setForm({
      finca_id: "", cosecha_id: "", periodo_id: "", lote_id: "", tipo_codigo: "", titulo: "", descripcion: "",
      fecha_programada: new Date().toISOString().slice(0, 16), asignados: [],
    });
    setDetalle({});
    setRecursosSel([]);
    setLotes([]);
    setCosechaActiva(null);
  };

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const agregarRecurso = (item) => {
    if (recursosSel.some((r) => r.item_id === item.id)) return;
    setRecursosSel((prev) => [...prev, {
      item_id: item.id, nombre: item.nombre, categoria: item.categoria, unidad_codigo: item.unidad,
      unidad_id: item.unidad_id, cantidad_planificada: 1, stock_actual: item.stock_actual,
    }]);
  };

  const quitarRecurso = (id) => setRecursosSel(prev => prev.filter(r => r.item_id !== id));

 const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.cosecha_id) return toast.error("Debes seleccionar una finca con Cosecha Activa.");
    
    setLoading(true);
    try {
      // 1. Limpieza de tipos numéricos
      const detalleSanitizado = {};
      Object.keys(detalle).forEach((key) => {
        const val = detalle[key];
        if (['porcentaje_plantas_plan_pct', 'cobertura_planificada_pct', 'kg_planificados', 'periodo_carencia_dias', 'periodo_reingreso_horas'].includes(key)) {
          detalleSanitizado[key] = val === "" ? null : Number(val);
        } else {
          detalleSanitizado[key] = val;
        }
      });

      // ---------------------------------------------------------
      // 🟢 NUEVO: Auto-asignar Equipo si es Fitosanitario
      // ---------------------------------------------------------
      if (form.tipo_codigo === "fitosanitario") {
        // Buscamos si el usuario agregó algún Equipo o Herramienta a la lista de recursos
        const equipoSeleccionado = recursosSel.find(r => 
          r.categoria === "Equipo" || r.categoria === "Herramienta"
        );
        
        // Si encontró uno, usamos su nombre. Si no, no mandamos nada (el backend pondrá default)
        if (equipoSeleccionado) {
          detalleSanitizado.equipo_aplicacion = equipoSeleccionado.nombre;
        }
      }
      // ---------------------------------------------------------

      const payload = {
        ...form,
        lote_id: Number(form.lote_id), 
        cosecha_id: Number(form.cosecha_id), 
        periodo_id: form.periodo_id ? Number(form.periodo_id) : null,
        fecha_programada: new Date(form.fecha_programada).toISOString(), 
        asignados: form.asignados.map(Number),
        detalle: detalleSanitizado, // <--- Aquí ya va con el equipo inyectado
        items: recursosSel.map((r) => ({
          item_id: r.item_id, 
          categoria: r.categoria, 
          unidad_codigo: r.unidad_codigo, 
          unidad_id: r.unidad_id, 
          cantidad_planificada: Number(r.cantidad_planificada),
        })),
      };

      await crearTarea(payload);
      toast.success("Tarea creada exitosamente ✅");
      onCreated?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Error al crear la tarea");
    } finally { setLoading(false); }
  };
  const listaRecursosFiltrada = useMemo(() => {
    const q = busquedaRecurso.toLowerCase();
    return (inventario || []).filter((i) => i.nombre.toLowerCase().includes(q));
  }, [inventario, busquedaRecurso]);

  return (
    <VentanaModal
      abierto={open}
      cerrar={onClose}
      titulo={<div className="flex items-center gap-2"><Sprout className="text-emerald-600"/><span>Nueva Tarea Agrícola</span></div>}
      footer={<>
        <Boton variante="fantasma" onClick={onClose} disabled={loading}>Cancelar</Boton>
        <Boton onClick={handleSubmit} cargando={loading} disabled={loading || !form.cosecha_id}>Crear Tarea</Boton>
      </>}
      ancho="max-w-6xl"
    >
      <form className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-5 border-r border-slate-100 pr-0 lg:pr-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><ClipboardList size={14}/> Datos Generales</h4>
            
            {/* 1. SELECCIÓN DE FINCA (OBLIGATORIA) */}
            <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                <Select label="Finca" name="finca_id" value={form.finca_id} onChange={handleChange} required icono={Tractor}>
                    <option value="">Seleccione Finca...</option>
                    {fincas.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                </Select>
            </div>

            {loadingContexto ? (
                <div className="py-4 text-center text-xs text-slate-400 animate-pulse">Cargando lotes y cosecha...</div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        {/* Cosecha: Solo lectura, se auto-selecciona */}
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-700 uppercase">Cosecha Activa</label>
                            <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-600">
                                {cosechaActiva ? cosechaActiva.nombre : "Sin Cosecha Activa"}
                            </div>
                        </div>
                        <Select label="Etapa (Periodo)" name="periodo_id" value={form.periodo_id} onChange={handleChange}>
                            <option value="">(General)</option>
                            {periodos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Lote" name="lote_id" value={form.lote_id} onChange={handleChange} required icono={MapPin} disabled={!form.finca_id}>
                            <option value="">Seleccione Lote...</option>
                            {lotes.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                        </Select>
                        <Select label="Actividad" name="tipo_codigo" value={form.tipo_codigo} onChange={handleChange} required icono={Tag}>
                            <option value="">Seleccione...</option>
                            {tiposActividad.map((t) => <option key={t.codigo} value={t.codigo}>{t.nombre}</option>)}
                        </Select>
                    </div>
                </>
            )}

            <div className="grid grid-cols-1 gap-4">
               <Input label="Fecha Programada" type="datetime-local" name="fecha_programada" value={form.fecha_programada} onChange={handleChange} required icono={Calendar} />
               <Input label="Título (Opcional)" name="titulo" value={form.titulo} onChange={handleChange} placeholder="Ej. Fumigación preventiva" />
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Descripción</label>
               <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={2} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Detalles..."/>
            </div>
           
            <SelectUsuariosChecklist usuarios={usuarios} value={form.asignados} onChange={(arr) => setForm(prev => ({ ...prev, asignados: arr }))} />
        </div>

        {/* COLUMNA DERECHA: DETALLES Y RECURSOS (Igual que antes) */}
        <div className="lg:col-span-7 space-y-6 flex flex-col h-full">
           <div className={`transition-all duration-300 ${form.tipo_codigo ? 'opacity-100' : 'opacity-50 grayscale'}`}>
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><AlertCircle size={14}/> Detalles Técnicos</h4>
              {form.tipo_codigo ? <FormularioDetalleActividad tipo={form.tipo_codigo} detalle={detalle} setDetalle={setDetalle} /> : 
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm">Selecciona una actividad para configurar parámetros BPA.</div>}
           </div>

           <div className="flex-1 flex flex-col min-h-[300px]">
              <div className="flex items-center justify-between mb-3">
                 <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Package size={14}/> Recursos</h4>
                 <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    {["Insumo", "Herramienta", "Equipo"].map((cat) => (
                       <button type="button" key={cat} onClick={() => setTabRecursos(cat)} className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${tabRecursos === cat ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{cat}</button>
                    ))}
                 </div>
              </div>
              <div className="relative mb-3">
                 <Input icono={Search} placeholder={`Buscar ${tabRecursos}...`} value={busquedaRecurso} onChange={(e) => setBusquedaRecurso(e.target.value)} />
                 {busquedaRecurso && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-xl rounded-xl z-20 max-h-48 overflow-y-auto mt-1">
                       {listaRecursosFiltrada.map((item) => (
                          <div key={item.id} onClick={() => { agregarRecurso(item); setBusquedaRecurso(""); }} className="px-3 py-2 text-xs hover:bg-emerald-50 cursor-pointer border-b border-slate-50 flex justify-between items-center">
                             <div><div className="font-semibold text-slate-700">{item.nombre}</div><div className="text-[10px] text-slate-400">{item.stock_actual} {item.unidad}</div></div>
                             <Plus size={14} className="text-emerald-500"/>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl overflow-y-auto p-2 space-y-1 custom-scrollbar max-h-48">
                 {recursosSel.map((r) => (
                    <div key={r.item_id} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                       <div className="flex-1"><div className="text-xs font-bold text-slate-700">{r.nombre}</div><div className="text-[10px] text-slate-400">{r.categoria}</div></div>
                       <input type="number" min="0.1" step="0.1" value={r.cantidad_planificada} onChange={(e) => setRecursosSel(prev => prev.map(x => x.item_id === r.item_id ? {...x, cantidad_planificada: e.target.value} : x))} className="w-14 h-7 text-xs text-center border rounded outline-none focus:ring-1 focus:ring-emerald-500"/>
                       <span className="text-[10px] text-slate-400 w-8">{r.unidad_codigo}</span>
                       <button type="button" onClick={() => quitarRecurso(r.item_id)} className="w-7 h-7 flex items-center justify-center text-rose-400 hover:bg-rose-50 rounded"><Trash2 size={14}/></button>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </form>
    </VentanaModal>
  );
}