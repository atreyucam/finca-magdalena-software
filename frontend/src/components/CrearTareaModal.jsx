import { useEffect, useState, useMemo, useRef, useCallback } from "react"; 
import useToast from "../hooks/useToast";

import {
  crearTarea, listarFincas, obtenerContextoFinca, listarUsuarios, listarTiposActividad, listarItemsInventario,
} from "../api/apiClient";

// Componentes UI internos
import Boton from "./ui/Boton";
import Input from "./ui/Input";
import Select from "./ui/Select";
import FormularioDetalleActividad from "./FormularioDetalleActividad";
import SelectUsuariosChecklist from "./SelectUsuariosChecklist";

// Iconos
import { 
  Calendar, MapPin, Tag, Package, Search, Plus, Trash2, 
  AlertCircle, Sprout, ClipboardList, Tractor, X 
} from "lucide-react";

export default function CrearTareaModal({ open, onClose, onCreated }) {
  const panelRef = useRef(null);

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

  const notify = useToast();

  // Formulario
  const [form, setForm] = useState({
    finca_id: "", 
    cosecha_id: "", 
    periodo_id: "", 
    lote_id: "", 
    tipo_codigo: "", 
    titulo: "", 
    metodologia: "",
    fecha_programada: new Date().toISOString().slice(0, 16), 
    asignados: [],
  });
  
  const [detalle, setDetalle] = useState({});

  const resetForm = useCallback(() => {
    setForm({
      finca_id: "", cosecha_id: "", periodo_id: "", lote_id: "", tipo_codigo: "", titulo: "", metodologia: "",
      fecha_programada: new Date().toISOString().slice(0, 16), asignados: [],
    });
    setDetalle({});
    setRecursosSel([]);
    setLotes([]);
    setCosechaActiva(null);
  }, []);

  const cargarCatalogosGlobales = useCallback(async () => {
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
    } catch {
      notify.error("Error cargando datos iniciales");
    }
  }, [notify]);

  const cargarInventario = useCallback(async (categoria) => {
    try {
      const res = await listarItemsInventario({ categoria, activos: true });

      // ✅ Normalizar a array sí o sí
      const raw = res?.data;
      const items =
        Array.isArray(raw) ? raw :
        Array.isArray(raw?.data) ? raw.data :
        Array.isArray(raw?.items) ? raw.items :
        Array.isArray(raw?.data?.data) ? raw.data.data :
        [];

      setInventario(items);
    } catch (err) {
      console.error(err);
      setInventario([]); // ✅ evita dejar basura
    }
  }, []);

  // 1. Cargar datos globales al abrir
  useEffect(() => {
    if (open) { 
      resetForm(); 
      cargarCatalogosGlobales(); 
      cargarInventario("Insumo");
    }
  }, [open, resetForm, cargarCatalogosGlobales, cargarInventario]);

  // ✅ Manejadores de cierre (Esc, click outside)
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && !loading && onClose?.();
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && !loading) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    
    // Bloquear scroll del body principal
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
      html.style.overflow = prevOverflow;
    };
  }, [open, onClose, loading]);

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
            const res = await obtenerContextoFinca(form.finca_id);
            const { lotes, cosechaActiva } = res.data;
            
            setLotes(lotes || []);
            setCosechaActiva(cosechaActiva);
            
            if (cosechaActiva) {
                setForm(prev => ({ ...prev, cosecha_id: String(cosechaActiva.id) }));
                setPeriodos(cosechaActiva.PeriodoCosechas || []);
            } else {
                notify.warning("⚠️ Esta finca no tiene una Cosecha Activa.");
                setForm(prev => ({ ...prev, cosecha_id: "" }));
            }
        } catch (error) {
            console.error(error);
            notify.error("Error cargando lotes de la finca");
        } finally {
            setLoadingContexto(false);
        }
    };
    cargarContexto();
  }, [form.finca_id, notify]);

  // 3. Resetear detalle al cambiar actividad
  useEffect(() => { setDetalle({}); }, [form.tipo_codigo]);

  // 4. Cargar inventario al cambiar tab
  useEffect(() => { if (open) cargarInventario(tabRecursos); }, [tabRecursos, open, cargarInventario]);

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
    if (!form.cosecha_id) return notify.error("Debes seleccionar una finca con Cosecha Activa.");
    
    setLoading(true);
    try {
      const detalleSanitizado = {};
      Object.keys(detalle).forEach((key) => {
        const val = detalle[key];
        if (
          [
            "cobertura_planificada_pct",
            "kg_planificados",
            "periodo_carencia_dias",
            "periodo_reingreso_horas",
            "numero_plantas_intervenir",
            "numero_fundas_colocadas",
            "grado_maduracion",
          ].includes(key)
        ) {
          detalleSanitizado[key] = val === "" ? null : Number(val);
        } else {
          detalleSanitizado[key] = val;
        }
      });

      if (form.tipo_codigo === "fitosanitario") {
        const equipoSeleccionado = recursosSel.find(r => 
          r.categoria === "Equipo" || r.categoria === "Herramienta"
        );
        if (equipoSeleccionado) {
          detalleSanitizado.equipo_aplicacion = equipoSeleccionado.nombre;
        }
      }

      const payload = {
        ...form,
        lote_id: Number(form.lote_id), 
        cosecha_id: Number(form.cosecha_id), 
        periodo_id: form.periodo_id ? Number(form.periodo_id) : null,
        fecha_programada: new Date(form.fecha_programada).toISOString(), 
        asignados: form.asignados.map(Number),
        detalle: detalleSanitizado,
        items: recursosSel.map((r) => ({
          item_id: r.item_id, 
          categoria: r.categoria, 
          unidad_codigo: r.unidad_codigo, 
          unidad_id: r.unidad_id, 
          cantidad_planificada: Number(r.cantidad_planificada),
        })),
      };

      await crearTarea(payload);
      notify.success("Tarea creada exitosamente ✅");
      onCreated?.();
      onClose();
    } catch (err) {
      notify.error(err?.response?.data?.message || "Error al crear la tarea");
    } finally { setLoading(false); }
  };

const listaRecursosFiltrada = useMemo(() => {
  const arr = Array.isArray(inventario) ? inventario : [];
  const q = (busquedaRecurso || "").toLowerCase();
  return arr.filter((i) => (i?.nombre || "").toLowerCase().includes(q));
}, [inventario, busquedaRecurso]);


  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-[1px] p-0 sm:p-4 flex sm:items-center sm:justify-center">
      {/* ✅ CORRECCIÓN DEL SCROLL:
         - Usamos `flex flex-col` en lugar de `grid`.
         - `max-h` controla la altura máxima.
         - El div central tiene `flex-1` y `overflow-y-auto` para que sea el único que scrollee.
      */}
      <div ref={panelRef} className="w-full max-w-none sm:max-w-6xl h-[100dvh] sm:h-auto sm:max-h-[calc(100dvh-2rem)] bg-white shadow-[0_24px_60px_rgba(0,0,0,.18)] sm:rounded-2xl border border-slate-200 flex flex-col overflow-hidden">
        
        {/* ✅ HEADER (Fijo) */}
        <div className="flex-none px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-200 flex items-start justify-between bg-slate-50/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
               <Sprout size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                Nueva Tarea Agrícola
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Planificación operativa y asignación de recursos.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => !loading && onClose?.()} 
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ✅ BODY (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5">
          <form id="crearTareaForm" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* COLUMNA IZQUIERDA */}
            <div className="lg:col-span-5 space-y-5 border-r border-slate-100 pr-0 lg:pr-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><ClipboardList size={14}/> Datos Generales</h4>
                
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
                   <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Metodología</label>
                   <textarea name="metodologia" value={form.metodologia} onChange={handleChange} rows={2} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Describe la metodología de ejecución..."/>
                </div>
               
                <SelectUsuariosChecklist usuarios={usuarios} value={form.asignados} onChange={(arr) => setForm(prev => ({ ...prev, asignados: arr }))} />
            </div>

            {/* COLUMNA DERECHA */}
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
        </div>

        {/* ✅ FOOTER (Fijo) */}
        <div className="flex-none px-4 sm:px-6 lg:px-8 py-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex justify-end gap-3">
            <Boton variante="fantasma" onClick={onClose} disabled={loading} className="bg-white border-slate-300">
              Cancelar
            </Boton>
            <Boton onClick={handleSubmit} cargando={loading} disabled={loading || !form.cosecha_id}>
              Crear Tarea
            </Boton>
          </div>
        </div>

      </div>
    </div>
  );
}
