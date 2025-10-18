import { useEffect, useMemo, useState, useRef } from "react";
import {
  crearTarea,
  listarLotes,
  listarCosechas,
  listarUsuarios,
  listarTiposActividad,
  listarItemsInventario,
  configurarInsumosTarea,
} from "../api/apiClient";
import toast from "react-hot-toast";

export default function CrearTareaModal({ open, onClose, onCreated }) {
  const panelRef = useRef(null);

  const [lotes, setLotes] = useState([]);
  const [cosechas, setCosechas] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [tiposActividad, setTiposActividad] = useState([]);

  const [busqueda, setBusqueda] = useState("");
  const [tab, setTab] = useState("Insumos"); // Insumos | Herramientas | Equipo

  // catálogos por categoría
  const [insumosCat, setInsumosCat] = useState([]);
  const [herramientasCat, setHerramientasCat] = useState([]);
  const [equiposCat, setEquiposCat] = useState([]);

  // seleccionados
  const [insumosSel, setInsumosSel] = useState([]);
  const [herrSel, setHerrSel] = useState([]);
  const [eqSel, setEqSel] = useState([]);

  const [form, setForm] = useState({
    cosecha_id: "",
    periodo_id: "",
    lote_id: "",
    tipo_codigo: "",
    fecha_programada: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16), // "YYYY-MM-DDTHH:MM"
    titulo: "",
    descripcion: "",
    asignados: [],
  });

  // estilos utilitarios
  const inputBase =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";
  const textareaBase =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";
  const btnPrimary =
    "inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-700";
  const btnGhost =
    "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";

  // cargar data al abrir
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [tiposRes, lotesRes, cosechasRes, usuariosRes] = await Promise.all([
          listarTiposActividad(),
          listarLotes(),
          listarCosechas(),
          listarUsuarios({ estado: "Activo", pageSize: 100 }),
        ]);

        setTiposActividad(tiposRes.data || []);
        setLotes(lotesRes.data || []);

        const activas = (cosechasRes.data || []).filter((c) => c.estado === "Activa");
        setCosechas(activas);
        if (activas.length === 1) {
          setForm((f) => ({ ...f, cosecha_id: String(activas[0].id) }));
          setPeriodos(activas[0].PeriodoCosechas || []);
        } else {
          setPeriodos([]);
        }

        setUsuarios(
          (usuariosRes.data?.data || []).filter(
            (u) => u.role === "Trabajador" || u.role === "Tecnico"
          )
        );

        const [ins, herr, eq] = await Promise.all([
          listarItemsInventario({ categoria: "Insumo", activos: true }),
          listarItemsInventario({ categoria: "Herramienta", activos: true }),
          listarItemsInventario({ categoria: "Equipo", activos: true }),
        ]);
        setInsumosCat(ins.data || []);
        setHerramientasCat(herr.data || []);
        setEquiposCat(eq.data || []);

        setInsumosSel([]); setHerrSel([]); setEqSel([]);
        setBusqueda(""); setTab("Insumos");

        // focus inicial
        setTimeout(() => {
          const el = panelRef.current?.querySelector("select[name='cosecha_id']");
          el?.focus();
        }, 0);
      } catch (err) {
        console.error("Error preparando modal:", err);
        toast.error("No se pudieron cargar datos");
      }
    })();
  }, [open]);

  // cerrar con Esc y click fuera
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, onClose]);

  // bloquear scroll de fondo
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => { html.style.overflow = prev; };
  }, [open]);

  // periodos cuando cambia cosecha
  useEffect(() => {
    if (!form.cosecha_id) { setPeriodos([]); return; }
    const c = cosechas.find((x) => String(x.id) === String(form.cosecha_id));
    setPeriodos(c?.PeriodoCosechas || []);
    setForm((f) => ({ ...f, periodo_id: "" }));
  }, [form.cosecha_id, cosechas]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };
  const handleAsignados = (e) => {
    const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
    setForm((f) => ({ ...f, asignados: selected }));
  };

  const listaFiltro = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const base = tab === "Insumos" ? insumosCat : tab === "Herramientas" ? herramientasCat : equiposCat;
    if (!q) return base;
    return base.filter((i) => i.nombre.toLowerCase().includes(q));
  }, [tab, busqueda, insumosCat, herramientasCat, equiposCat]);

  // agregar/quitar
  const addInsumo = (item) => {
    if (insumosSel.some((x) => x.item_id === item.id)) return;
    setInsumosSel((prev) => [...prev, {
      item_id: item.id, nombre: item.nombre, unidad: item.unidad,
      cantidad: 1, stock_actual: item.stock_actual
    }]);
  };
  const addHerr = (item) => {
    if (herrSel.some((x) => x.item_id === item.id)) return;
    setHerrSel((prev) => [...prev, { item_id: item.id, nombre: item.nombre }]);
  };
  const addEq = (item) => {
    if (eqSel.some((x) => x.item_id === item.id)) return;
    setEqSel((prev) => [...prev, { item_id: item.id, nombre: item.nombre }]);
  };
  const agregar = (item) => (tab === "Insumos" ? addInsumo(item) : tab === "Herramientas" ? addHerr(item) : addEq(item));
  const actualizarCant = (id, val) => {
    setInsumosSel((prev) => prev.map((i) => (i.item_id === id ? { ...i, cantidad: Number(val) || 0 } : i)));
  };
  const quitar = (tipo, id) => {
    if (tipo === "ins") setInsumosSel((p) => p.filter((x) => x.item_id !== id));
    if (tipo === "herr") setHerrSel((p) => p.filter((x) => x.item_id !== id));
    if (tipo === "eq") setEqSel((p) => p.filter((x) => x.item_id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        cosecha_id: Number(form.cosecha_id),
        periodo_id: form.periodo_id ? Number(form.periodo_id) : null,
        lote_id: Number(form.lote_id),
        tipo_codigo: form.tipo_codigo,
        fecha_programada: new Date(form.fecha_programada).toISOString(),
        descripcion: form.descripcion || null,
        asignados: form.asignados.map((x) => Number(x)),
        detalles: { herramientas: herrSel, equipos: eqSel },
      };
      if (form.titulo && form.titulo.trim()) payload.titulo = form.titulo.trim();

      const res = await crearTarea(payload);
      const tarea = res.data;

      if (insumosSel.length > 0) {
        await configurarInsumosTarea(tarea.id, {
          insumos: insumosSel.map((i) => ({
            item_id: i.item_id,
            cantidad: Number(i.cantidad || 0),
            unidad_codigo: i.unidad,
          })),
        });
      }

      toast.success("Tarea creada ✅");
      onCreated?.(tarea);
      onClose?.();
    } catch (err) {
      console.error("Error creando tarea:", err);
      toast.error(err?.response?.data?.message || "No se pudo crear la tarea");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-[1px] p-3 sm:p-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Crear nueva tarea"
        className={[
          // ancho y altura EXACTA al viewport menos margen
          "w-full max-w-[min(1040px,calc(100vw-1rem))]",
          "h-[calc(100dvh-1rem)] sm:h-[calc(100dvh-2rem)]",
          // card
          "rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(0,0,0,.18)]",
          // grid 3 filas + ocultar desborde (evita que el footer se pierda)
          "grid grid-rows-[auto,1fr,auto] overflow-hidden"
        ].join(" ")}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 lg:px-8 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Crear nueva tarea</h2>
            <p className="text-xs sm:text-sm text-slate-500">Planifica la actividad, asigna responsables y recursos.</p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Contenido con scroll propio */}
        <div className="min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4">
          <form id="crearTareaForm" onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Columna izquierda */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Cosecha</label>
                <select name="cosecha_id" value={form.cosecha_id} onChange={handleChange} required className={`${inputBase} mt-1`}>
                  <option value="">Seleccione una cosecha</option>
                  {cosechas.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.nombre} ({c.anio_agricola})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Periodo</label>
                <select name="periodo_id" value={form.periodo_id} onChange={handleChange} className={`${inputBase} mt-1`}>
                  <option value="">Seleccione el periodo</option>
                  {periodos.map((p) => (
                    <option key={p.id} value={String(p.id)}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Título (opcional)</label>
                <input type="text" name="titulo" value={form.titulo} onChange={handleChange}
                  placeholder="Ej. Control de malezas en Lote A" maxLength={150} className={`${inputBase} mt-1`} />
                <p className="mt-1 text-xs text-slate-500">Si lo dejas vacío, se usará el nombre del tipo de actividad.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Lote</label>
                <select name="lote_id" value={form.lote_id} onChange={handleChange} required className={`${inputBase} mt-1`}>
                  <option value="">Seleccione un lote</option>
                  {lotes.map((l) => (
                    <option key={l.id} value={String(l.id)}>{l.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Tipo de actividad</label>
                <select name="tipo_codigo" value={form.tipo_codigo} onChange={handleChange} required className={`${inputBase} mt-1`}>
                  <option value="">Seleccione un tipo</option>
                  {tiposActividad.map((t) => (
                    <option key={t.codigo} value={t.codigo}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Fecha y hora programada</label>
                <input
                  type="datetime-local"
                  name="fecha_programada"
                  value={form.fecha_programada}
                  onChange={handleChange}
                  min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  required
                  className={`${inputBase} mt-1`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Descripción</label>
                <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={3} className={`${textareaBase} mt-1`} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Asignar a</label>
                <select multiple name="asignados" value={form.asignados} onChange={handleAsignados} className={`${inputBase} mt-1 h-32`}>
                  {usuarios.map((u) => (
                    <option key={u.id} value={String(u.id)}>{u.nombres} {u.apellidos} ({u.role})</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">Mantén presionado Ctrl (Windows) o Cmd (Mac) para seleccionar varios.</p>
              </div>
            </div>

            {/* Columna derecha: Tabs selección */}
            <div className="space-y-3">
              <div className="flex gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
                {["Insumos", "Herramientas", "Equipo"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={[
                      "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-800",
                    ].join(" ")}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className={inputBase}
                  placeholder={`Buscar ${tab.toLowerCase()}...`}
                />
              </div>

              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200">
                {listaFiltro.length > 0 ? (
                  <ul className="divide-y divide-slate-200">
                    {listaFiltro.map((i) => (
                      <li
                        key={i.id}
                        onClick={() => agregar(i)}
                        className="flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-slate-50"
                      >
                        <span className="text-sm text-slate-800">
                          {i.nombre}
                          {tab === "Insumos" && (
                            <>
                              {" "}
                              <span className="text-slate-500">({i.unidad})</span>{" "}
                              <span className="text-xs text-slate-500">— Stock: {i.stock_actual}</span>
                            </>
                          )}
                        </span>
                        <span className="text-xs text-slate-500">{tab.slice(0, -1)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-3 text-sm text-slate-500">Sin resultados</div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-700">Seleccionados</h3>

                {insumosSel.length > 0 && (
                  <div className="space-y-2">
                    {insumosSel.map((i) => (
                      <div key={i.item_id} className="flex items-center justify-between rounded-xl border border-slate-200 p-2">
                        <div className="text-sm text-slate-800">
                          {i.nombre} <span className="text-slate-500">— Stock: {i.stock_actual} {i.unidad}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={i.cantidad}
                            onChange={(e) => actualizarCant(i.item_id, e.target.value)}
                            className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                          />
                          <span className="text-xs text-slate-600">{i.unidad}</span>
                          <button type="button" className="text-xs font-medium text-rose-600 hover:underline" onClick={() => quitar("ins", i.item_id)}>
                            Quitar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {herrSel.length > 0 && (
                  <div>
                    <div className="mb-1 text-sm font-medium text-slate-700">Herramientas</div>
                    <div className="space-y-2">
                      {herrSel.map((h) => (
                        <div key={h.item_id} className="flex items-center justify-between rounded-xl border border-slate-200 p-2">
                          <span className="text-sm text-slate-800">{h.nombre}</span>
                          <button type="button" className="text-xs font-medium text-rose-600 hover:underline" onClick={() => quitar("herr", h.item_id)}>
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {eqSel.length > 0 && (
                  <div>
                    <div className="mb-1 text-sm font-medium text-slate-700">Equipos</div>
                    <div className="space-y-2">
                      {eqSel.map((h) => (
                        <div key={h.item_id} className="flex items-center justify-between rounded-xl border border-slate-200 p-2">
                          <span className="text-sm text-slate-800">{h.nombre}</span>
                          <button type="button" className="text-xs font-medium text-rose-600 hover:underline" onClick={() => quitar("eq", h.item_id)}>
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {insumosSel.length === 0 && herrSel.length === 0 && eqSel.length === 0 && (
                  <p className="text-sm text-slate-500">Ninguno seleccionado</p>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer fijo (siempre visible) */}
        <div className="px-4 sm:px-6 lg:px-8 py-3 border-t border-slate-200 bg-white">
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className={btnGhost}>
              Cancelar
            </button>
            <button type="submit" form="crearTareaForm" className={btnPrimary}>
              Crear tarea
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
