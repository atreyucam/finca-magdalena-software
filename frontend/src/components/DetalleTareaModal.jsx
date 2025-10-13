import { useEffect, useMemo, useState } from "react";
import {
  obtenerTarea,
  listarNovedadesTarea,
  crearNovedadTarea,
  verificarTarea,
  listarInsumosTarea,
  configurarInsumosTarea,
  listarItemsInventario,
  listarUsuarios,
  asignarUsuarios, // POST /tareas/:id/asignaciones
} from "../api/apiClient";
import toast from "react-hot-toast";

export default function DetalleTareaPanel({ open, onClose, tareaId, onUpdated }) {
  // -------- base --------
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tarea, setTarea] = useState(null);

  // -------- comentarios/novedades --------
  const [novedades, setNovedades] = useState([]);
  const [comentario, setComentario] = useState("");

  // -------- insumos (lectura/edición) --------
  const [insumos, setInsumos] = useState([]);
  const [editItems, setEditItems] = useState(false);
  const [tab, setTab] = useState("Insumo"); // Insumo | Herramienta | Equipo (filtro de búsqueda)
  const [busqueda, setBusqueda] = useState("");
  const [inventario, setInventario] = useState([]);

  // -------- asignaciones --------
  const [editAsign, setEditAsign] = useState(false);
  const [users, setUsers] = useState([]);
  const [selAsign, setSelAsign] = useState([]); // ids strings

  // -------- verificación --------
  const [showVerify, setShowVerify] = useState(false);
  const [verifyNote, setVerifyNote] = useState("");

  const herrReq = useMemo(() => tarea?.detalles?.herramientas || [], [tarea]);
  const eqReq   = useMemo(() => tarea?.detalles?.equipos || [], [tarea]);

  // ---- carga inicial + recarga por tab de inventario ----
  useEffect(() => {
    if (!open || !tareaId) return;

    (async () => {
      try {
        setLoading(true);
        const [tRes, nRes, iRes, invRes, uRes] = await Promise.all([
          obtenerTarea(tareaId),
          listarNovedadesTarea(tareaId),
          listarInsumosTarea(tareaId),
          listarItemsInventario({ categoria: tab, activos: true }),
          listarUsuarios({ estado: "Activo", pageSize: 200 }),
        ]);

        setTarea(tRes.data);
        setNovedades(nRes.data || []);
        setInsumos(iRes.data || []);
        setInventario(invRes.data || []);

        const us = (uRes.data?.data || []).filter(u => ["Trabajador","Tecnico"].includes(u.role));
        setUsers(us);
        setSelAsign((tRes.data?.asignaciones || []).map(a => String(a.usuario?.id)).filter(Boolean));
        setError(null);
      } catch (e) {
        console.error(e);
        setError("No se pudo cargar el detalle.");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, tareaId, tab]);

  // ====== acciones ======
  const addNovedad = async () => {
    if (!comentario.trim()) return;
    try {
      await crearNovedadTarea(tareaId, { texto: comentario.trim() });
      setComentario("");
      // refrescar lista
      const nRes = await listarNovedadesTarea(tareaId);
      setNovedades(nRes.data || []);
      // también reflejar en historial
      setTarea(prev => ({
        ...prev,
        estados: [
          ...(prev?.estados || []),
          {
            estado: prev?.estado,
            fecha: new Date().toISOString(),
            comentario: `Novedad: ${comentario.trim()}`,
            usuario: { nombre: "Tú" },
          },
        ],
      }));
      toast.success("Novedad registrada ✅");
      onUpdated?.();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "No se pudo registrar la novedad");
    }
  };

  // ---- insumos ----
  const agregarItem = (it) => {
    // solo los "Insumo" se pueden agregar (herr/equipo son lectura)
    if (it.categoria !== "Insumo") {
      toast("Herramientas/Equipos son requerimientos (no consumen stock).");
      return;
    }
    if (insumos.some(x => x.item_id === it.id)) return;
    setInsumos(prev => [
      ...prev,
      { item_id: it.id, item: it.nombre, cantidad: 1, unidad: it.unidad, stock_actual: it.stock_actual }
    ]);
  };
  const actualizarCant = (id, v) => {
    setInsumos(prev => prev.map(x => x.item_id === id ? { ...x, cantidad: Number(v) } : x));
  };
  const quitarItem = (id) => setInsumos(prev => prev.filter(x => x.item_id !== id));
  const guardarInsumos = async () => {
    try {
      await configurarInsumosTarea(tareaId, {
        insumos: insumos.map(i => ({
          item_id: i.item_id,
          cantidad: Number(i.cantidad),
          unidad_codigo: i.unidad,
        })),
      });
      toast.success("Insumos actualizados ✅");
      setEditItems(false);
      // dejar traza en historial
      setTarea(prev => ({
        ...prev,
        estados: [
          ...(prev?.estados || []),
          { estado: prev?.estado, fecha: new Date().toISOString(), comentario: "Insumos modificados", usuario: { nombre: "Tú" } }
        ],
      }));
      onUpdated?.();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "No se pudieron actualizar los insumos");
    }
  };

  // ---- asignaciones ----
  const guardarAsign = async () => {
    try {
      await asignarUsuarios(tareaId, { usuarios: selAsign.map(Number) });
      toast.success("Asignaciones actualizadas ✅");
      const tRes = await obtenerTarea(tareaId);
      setTarea(tRes.data);
      setEditAsign(false);
      setTarea(prev => ({
        ...prev,
        estados: [
          ...(prev?.estados || []),
          { estado: tRes.data?.estado, fecha: new Date().toISOString(), comentario: "Asignaciones actualizadas", usuario: { nombre: "Tú" } }
        ],
      }));
      onUpdated?.();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "No se pudieron actualizar las asignaciones");
    }
  };

  // ---- verificación ----
  const doVerify = async (force = false) => {
    try {
      await verificarTarea(tareaId, { comentario: verifyNote, force });
      toast.success(force ? "Verificada (forzada) ✅" : "Verificada ✅");
      setTarea(prev => ({
        ...prev,
        estado: "Verificada",
        estados: [
          ...(prev?.estados || []),
          { estado: "Verificada", fecha: new Date().toISOString(), comentario: verifyNote, usuario: { nombre: "Tú" } }
        ],
      }));
      setVerifyNote(""); setShowVerify(false);
      onUpdated?.();
    } catch (e) {
      const msg = e?.response?.data?.message || "";
      if (msg.toLowerCase().includes("stock insuficiente")) {
        const ok = confirm(`${msg}\n\n¿Forzar verificación? Esto puede dejar stock en negativo.`);
        if (ok) return doVerify(true);
      }
      toast.error(msg || "No se pudo verificar");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl p-6 md:p-8 overflow-y-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-gray-500 font-mono">#{tarea?.id}</div>
            <h2 className="text-2xl font-bold">{tarea?.tipo || "Detalle de tarea"}</h2>
            <div className="mt-1 text-sm text-gray-600">
              Lote <span className="font-medium">{tarea?.lote}</span> · Fecha <span className="font-medium">{tarea && new Date(tarea.fecha_programada).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tarea?.estado === "Completada" && (
              !showVerify ? (
                <button onClick={() => setShowVerify(true)} className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm">
                  Verificar
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    value={verifyNote}
                    onChange={e => setVerifyNote(e.target.value)}
                    placeholder="Comentario…"
                    className="border rounded-md p-2 text-sm w-64"
                  />
                  <button onClick={() => setShowVerify(false)} className="px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200 text-sm">Cancelar</button>
                  <button onClick={() => doVerify(false)} className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm">Confirmar</button>
                </div>
              )
            )}
            <button onClick={onClose} className="px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200 text-sm">Cerrar</button>
          </div>
        </div>

        {loading && <div className="mt-6 text-gray-500">Cargando…</div>}
        {error && <div className="mt-6 text-red-500">{error}</div>}

        {!loading && tarea && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
            {/* ============== LEFT: descripción + recursos + comentarios ============== */}
            <div className="lg:col-span-2 space-y-8">
              {/* Status strip */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  Estado: {tarea.estado}
                </span>
                {tarea.asignaciones?.length > 0 && (
                  <span className="text-xs px-2 py-1 rounded bg-gray-50 text-gray-700 border border-gray-200">
                    Asignado a: {tarea.asignaciones.map(a => a.usuario?.nombre).join(", ")}
                  </span>
                )}
              </div>

              {/* Description */}
              <section>
                <h3 className="font-semibold mb-2">Descripción</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {tarea.descripcion || "—"}
                </p>
              </section>

              {/* Recursos (insumos/requeridos) */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Recursos de la tarea</h3>
                  {!editItems ? (
                    <button
                      onClick={() => setEditItems(true)}
                      className="px-3 py-1.5 bg-blue-100 rounded hover:bg-blue-200 text-sm"
                    >
                      Modificar insumos / herramientas
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setEditItems(false)} className="px-3 py-1.5 bg-gray-100 rounded hover:bg-gray-200 text-sm">Cancelar</button>
                      <button onClick={guardarInsumos} className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Guardar insumos</button>
                    </div>
                  )}
                </div>

                {/* Lectura: Insumos */}
                <div>
                  <div className="text-sm font-medium mb-1">Insumos</div>
                  {insumos.length === 0 ? (
                    <div className="text-sm text-gray-500">Sin insumos</div>
                  ) : (
                    <ul className="divide-y rounded border">
                      {insumos.map(i => (
                        <li key={i.item_id} className="p-2 flex items-center justify-between gap-3">
                          <div className="text-sm">
                            <span className="font-medium">{i.item}</span>{" "}
                            <span className="text-gray-500">· Stock: {i.stock_actual} {i.unidad}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.001"
                              min="0.001"
                              value={i.cantidad}
                              onChange={e => actualizarCant(i.item_id, e.target.value)}
                              disabled={!editItems}
                              className={`w-24 border rounded p-1 text-sm ${!editItems ? "bg-gray-50 text-gray-500" : ""}`}
                            />
                            <span className="text-sm">{i.unidad}</span>
                            {editItems && (
                              <button className="text-red-500 text-sm hover:underline" onClick={() => quitarItem(i.item_id)}>Quitar</button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Lectura: Herramientas/Equipos requeridos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium mb-1">Herramientas requeridas</div>
                    {herrReq.length ? (
                      <ul className="text-sm text-gray-800 list-disc pl-5">
                        {herrReq.map(h => <li key={`h-${h.item_id || h.nombre}`}>{h.nombre}</li>)}
                      </ul>
                    ) : <div className="text-sm text-gray-500">Sin herramientas</div>}
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">Equipos requeridos</div>
                    {eqReq.length ? (
                      <ul className="text-sm text-gray-800 list-disc pl-5">
                        {eqReq.map(e => <li key={`e-${e.item_id || e.nombre}`}>{e.nombre}</li>)}
                      </ul>
                    ) : <div className="text-sm text-gray-500">Sin equipos</div>}
                  </div>
                </div>

                {/* Editor de recursos (arriba queda la parte de lectura) */}
                {editItems && (
                  <div className="mt-2 border rounded-lg p-3">
                    <div className="flex gap-2">
                      {["Insumo", "Herramienta", "Equipo"].map(c => (
                        <button
                          key={c}
                          onClick={() => setTab(c)}
                          className={`px-3 py-1.5 rounded border text-sm ${tab === c ? "bg-blue-50 border-blue-400" : "bg-white border-gray-300"}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>

                    <input
                      value={busqueda}
                      onChange={e => setBusqueda(e.target.value)}
                      placeholder={`Buscar ${tab.toLowerCase()}…`}
                      className="mt-2 w-full border rounded p-2 text-sm"
                    />
                    <div className="mt-2 max-h-40 overflow-y-auto border rounded">
                      {(inventario || [])
                        .filter(i => i.nombre.toLowerCase().includes(busqueda.toLowerCase()))
                        .map(i => (
                          <div
                            key={i.id}
                            className="px-2 py-1 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                            onClick={() => agregarItem(i)}
                          >
                            <div className="text-sm">
                              {i.nombre} <span className="text-gray-500">({i.unidad})</span>
                            </div>
                            <div className="text-xs text-gray-500">{i.categoria} · Stock {i.stock_actual}</div>
                          </div>
                        ))}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-2">
                      * Solo los <b>Insumos</b> se agregan a consumo. Herramientas/Equipos son solo requerimientos (lectura).
                    </p>
                  </div>
                )}
              </section>

              {/* Comments (Novedades) */}
              <section className="space-y-3">
                <div className="flex items-center gap-4">
                  <h3 className="font-semibold">Comments</h3>
                  <span className="text-xs text-gray-500">({novedades.length})</span>
                </div>

                {novedades.length ? (
                  <ul className="space-y-3">
                    {novedades.map(n => (
                      <li key={n.id} className="border rounded-lg p-3">
                        <div className="text-sm">{n.texto}</div>
                        <div className="text-[11px] text-gray-500 mt-1">
                          {new Date(n.created_at).toLocaleString()} — {n.autor?.nombre || "—"}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500">Sin comentarios</div>
                )}

                <div className="border rounded-lg">
                  <textarea
                    value={comentario}
                    onChange={e => setComentario(e.target.value)}
                    placeholder="Escribe un comentario…"
                    rows={3}
                    className="w-full p-3 rounded-lg outline-none"
                  />
                  <div className="flex justify-end p-2">
                    <button onClick={addNovedad} className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                      Enviar
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* ============== RIGHT: actividad / timeline + asignaciones editor ============== */}
            <div className="space-y-6">
              {/* Asignaciones (editor compacto en sidebar) */}
              <section className="border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Asignados</h4>
                  {!editAsign ? (
                    <button onClick={() => setEditAsign(true)} className="text-sm text-blue-600 hover:underline">Editar</button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setEditAsign(false)} className="text-sm text-gray-600 hover:underline">Cancelar</button>
                      <button onClick={guardarAsign} className="text-sm text-blue-600 hover:underline font-semibold">Guardar</button>
                    </div>
                  )}
                </div>

                {!editAsign ? (
                  <ul className="text-sm text-gray-800 space-y-1">
                    {(tarea.asignaciones || []).map(a => (
                      <li key={a.id}>• {a.usuario?.nombre} <span className="text-gray-500">({a.rol_en_tarea})</span></li>
                    ))}
                    {(!tarea.asignaciones || tarea.asignaciones.length === 0) && <li className="text-gray-500">Sin asignaciones</li>}
                  </ul>
                ) : (
                  <select
                    multiple
                    value={selAsign}
                    onChange={e => setSelAsign(Array.from(e.target.selectedOptions, o => o.value))}
                    className="mt-1 block w-full border rounded-md p-2 h-44 text-sm"
                  >
                    {users.map(u => (
                      <option key={u.id} value={String(u.id)}>
                        {u.nombres} {u.apellidos} ({u.role})
                      </option>
                    ))}
                  </select>
                )}
              </section>

              {/* Timeline Actividad */}
              <section className="border rounded-xl p-4">
                <h4 className="font-semibold mb-2">Activity</h4>
                {tarea.estados?.length ? (
                  <ol className="relative border-s ml-2 ps-4 space-y-4">
                    {tarea.estados.map((e, idx) => (
                      <li key={idx}>
                        <div className="absolute -start-1.5 rounded-full bg-blue-600 w-2 h-2 mt-2" />
                        <div className="text-sm">
                          <span className="font-medium">{e.estado}</span>{" "}
                          <span className="text-gray-500">
                            — {new Date(e.fecha).toLocaleString()}
                          </span>
                        </div>
                        {e.comentario && <div className="text-sm italic text-gray-700">{e.comentario}</div>}
                        {e.usuario?.nombre && <div className="text-[11px] text-gray-500">{e.usuario.nombre}</div>}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="text-sm text-gray-500">Sin actividad</div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
