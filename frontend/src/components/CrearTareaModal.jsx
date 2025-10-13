import { useEffect, useMemo, useState } from "react";
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
    // 👇 ahora con hora local por defecto (redondeado a minutos)
  fecha_programada: new Date(Date.now() - new Date().getTimezoneOffset()*60000)
                        .toISOString().slice(0,16), // "YYYY-MM-DDTHH:MM"
  titulo: "",       
    descripcion: "",
    asignados: [],
  });

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
        }

        setUsuarios(
          (usuariosRes.data?.data || []).filter(
            (u) => u.role === "Trabajador" || u.role === "Tecnico"
          )
        );

        // catálogos (por categoría)
        const [ins, herr, eq] = await Promise.all([
          listarItemsInventario({ categoria: "Insumo", activos: true }),
          listarItemsInventario({ categoria: "Herramienta", activos: true }),
          listarItemsInventario({ categoria: "Equipo", activos: true }),
        ]);
        setInsumosCat(ins.data || []);
        setHerramientasCat(herr.data || []);
        setEquiposCat(eq.data || []);

        // limpiar selecciones y búsqueda
        setInsumosSel([]);
        setHerrSel([]);
        setEqSel([]);
        setBusqueda("");
        setTab("Insumos");
      } catch (err) {
        console.error("Error preparando modal:", err);
        toast.error("No se pudieron cargar datos");
      }
    })();
  }, [open]);

  // periodos cuando cambia cosecha
  useEffect(() => {
    if (!form.cosecha_id) return;
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

  // listas filtradas por tab + búsqueda
  const listaFiltro = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const base =
      tab === "Insumos" ? insumosCat : tab === "Herramientas" ? herramientasCat : equiposCat;
    if (!q) return base;
    return base.filter((i) => i.nombre.toLowerCase().includes(q));
  }, [tab, busqueda, insumosCat, herramientasCat, equiposCat]);

  // agregar/quitar
  const addInsumo = (item) => {
    if (insumosSel.some((x) => x.item_id === item.id)) return;
    setInsumosSel((prev) => [
      ...prev,
      { item_id: item.id, nombre: item.nombre, unidad: item.unidad, cantidad: 1, stock_actual: item.stock_actual },
    ]);
  };
  const addHerr = (item) => {
    if (herrSel.some((x) => x.item_id === item.id)) return;
    setHerrSel((prev) => [...prev, { item_id: item.id, nombre: item.nombre }]);
  };
  const addEq = (item) => {
    if (eqSel.some((x) => x.item_id === item.id)) return;
    setEqSel((prev) => [...prev, { item_id: item.id, nombre: item.nombre }]);
  };

  const agregar = (item) => {
    if (tab === "Insumos") return addInsumo(item);
    if (tab === "Herramientas") return addHerr(item);
    return addEq(item);
  };

  const actualizarCant = (id, val) => {
    setInsumosSel((prev) =>
      prev.map((i) => (i.item_id === id ? { ...i, cantidad: Number(val) || 0 } : i))
    );
  };

  const quitar = (tipo, id) => {
    if (tipo === "ins") setInsumosSel((p) => p.filter((x) => x.item_id !== id));
    if (tipo === "herr") setHerrSel((p) => p.filter((x) => x.item_id !== id));
    if (tipo === "eq") setEqSel((p) => p.filter((x) => x.item_id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1) crear tarea
      // handleSubmit: payload
const payload = {
  cosecha_id: Number(form.cosecha_id),
  periodo_id: form.periodo_id ? Number(form.periodo_id) : null,
  lote_id: Number(form.lote_id),
  tipo_codigo: form.tipo_codigo,
  // 👇 usar la ISO con hora (datetime-local ya viene en local; conviértela a ISO)
  fecha_programada: new Date(form.fecha_programada).toISOString(),
  descripcion: form.descripcion || null,
  asignados: form.asignados.map((x) => Number(x)),
  detalles: { herramientas: herrSel, equipos: eqSel },
};

// Solo incluir titulo si no está vacío
if (form.titulo && form.titulo.trim()) {
  payload.titulo = form.titulo.trim();
}

const res = await crearTarea(payload);

      const tarea = res.data;

      // 2) configurar insumos (si hay)
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
      onClose();
    } catch (err) {
      console.error("Error creando tarea:", err);
      toast.error(err?.response?.data?.message || "No se pudo crear la tarea");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl p-6">
        <h2 className="text-xl font-semibold mb-4">Crear nueva tarea</h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Columna izquierda (orden solicitado) */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Cosecha</label>
              <select
                name="cosecha_id"
                value={form.cosecha_id}
                onChange={handleChange}
                required
                className="mt-1 block w-full border rounded-md p-2"
              >
                <option value="">Seleccione una cosecha</option>
                {cosechas.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.nombre} ({c.anio_agricola})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">Periodo</label>
              <select
                name="periodo_id"
                value={form.periodo_id}
                onChange={handleChange}
                className="mt-1 block w-full border rounded-md p-2"
              >
                <option value="">Seleccione el periodo</option>
                {periodos.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>


<div>
  <label className="block text-sm font-medium">Título (opcional)</label>
  <input
    type="text"
    name="titulo"
    value={form.titulo}
    onChange={handleChange}
    placeholder="Ej. Control de malezas en Lote A"
    className="mt-1 block w-full border rounded-md p-2"
    maxLength={150}
  />
  <p className="text-xs text-gray-500">
    Si lo dejas vacío, se usará el nombre del tipo de actividad.
  </p>
</div>


            <div>
              <label className="block text-sm font-medium">Lote</label>
              <select
                name="lote_id"
                value={form.lote_id}
                onChange={handleChange}
                required
                className="mt-1 block w-full border rounded-md p-2"
              >
                <option value="">Seleccione un lote</option>
                {lotes.map((l) => (
                  <option key={l.id} value={String(l.id)}>{l.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">Tipo de actividad</label>
              <select
                name="tipo_codigo"
                value={form.tipo_codigo}
                onChange={handleChange}
                required
                className="mt-1 block w-full border rounded-md p-2"
              >
                <option value="">Seleccione un tipo</option>
                {tiposActividad.map((t) => (
                  <option key={t.codigo} value={t.codigo}>{t.nombre}</option>
                ))}
              </select>
            </div>

            <div>
  <label className="block text-sm font-medium">Fecha y hora programada</label>
  <input
    type="datetime-local"
    name="fecha_programada"
    value={form.fecha_programada}
    onChange={handleChange}
    min={new Date(Date.now() - new Date().getTimezoneOffset()*60000)
            .toISOString().slice(0,16)}
    required
    className="mt-1 block w-full border rounded-md p-2"
  />
</div>


            <div>
              <label className="block text-sm font-medium">Descripción</label>
              <textarea
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                className="mt-1 block w-full border rounded-md p-2"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Asignar a</label>
              <select
                multiple
                name="asignados"
                value={form.asignados}
                onChange={handleAsignados}
                className="mt-1 block w-full border rounded-md p-2 h-28"
              >
                {usuarios.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.nombres} {u.apellidos} ({u.role})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Mantén presionado Ctrl (Windows) o Cmd (Mac) para seleccionar varios.
              </p>
            </div>
          </div>

          {/* Columna derecha: Tabs selección */}
          <div className="space-y-3">
            <div className="border-b flex gap-3">
              {["Insumos", "Herramientas", "Equipo"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`px-3 py-2 -mb-px ${
                    tab === t ? "border-b-2 border-blue-600 font-semibold" : "text-gray-500"
                  }`}
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
                className="flex-1 border rounded p-2"
                placeholder={`Buscar ${tab.toLowerCase()}...`}
              />
            </div>

            <div className="border rounded p-2 max-h-48 overflow-y-auto">
              {listaFiltro.map((i) => (
                <div
                  key={i.id}
                  className="flex justify-between items-center p-1 hover:bg-gray-100 cursor-pointer"
                  onClick={() => agregar(i)}
                >
                  <span>
                    {i.nombre}
                    {tab === "Insumos" && (
                      <> ({i.unidad}) — <span className="text-xs text-gray-500">Stock: {i.stock_actual}</span></>
                    )}
                  </span>
                  <span className="text-xs text-gray-500">{tab.slice(0, -1)}</span>
                </div>
              ))}
              {listaFiltro.length === 0 && (
                <div className="text-sm text-gray-500">Sin resultados</div>
              )}
            </div>

            {/* Asignados a la tarea */}
            <div>
              <h3 className="font-medium mb-1">Asignados a la tarea</h3>

              {/* Insumos */}
              {insumosSel.length > 0 && (
                <ul className="space-y-2 mb-3">
                  {insumosSel.map((i) => (
                    <li key={i.item_id} className="flex justify-between items-center border p-2 rounded">
                      <span>{i.nombre} — Stock: {i.stock_actual} {i.unidad}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={i.cantidad}
                          onChange={(e) => actualizarCant(i.item_id, e.target.value)}
                          className="w-20 border rounded p-1"
                        />
                        <span className="text-xs">{i.unidad}</span>
                        <button
                          type="button"
                          className="text-red-500 text-sm hover:underline"
                          onClick={() => quitar("ins", i.item_id)}
                        >
                          Quitar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Herramientas */}
              {herrSel.length > 0 && (
                <div className="mb-2">
                  <div className="text-sm text-gray-700 font-medium mb-1">Herramientas</div>
                  <ul className="space-y-1">
                    {herrSel.map((h) => (
                      <li key={h.item_id} className="flex justify-between items-center border p-2 rounded">
                        <span>{h.nombre}</span>
                        <button
                          type="button"
                          className="text-red-500 text-sm hover:underline"
                          onClick={() => quitar("herr", h.item_id)}
                        >
                          Quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Equipos */}
              {eqSel.length > 0 && (
                <div>
                  <div className="text-sm text-gray-700 font-medium mb-1">Equipos</div>
                  <ul className="space-y-1">
                    {eqSel.map((h) => (
                      <li key={h.item_id} className="flex justify-between items-center border p-2 rounded">
                        <span>{h.nombre}</span>
                        <button
                          type="button"
                          className="text-red-500 text-sm hover:underline"
                          onClick={() => quitar("eq", h.item_id)}
                        >
                          Quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {insumosSel.length === 0 && herrSel.length === 0 && eqSel.length === 0 && (
                <p className="text-sm text-gray-500">Ninguno seleccionado</p>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 mt-2 col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Crear tarea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
