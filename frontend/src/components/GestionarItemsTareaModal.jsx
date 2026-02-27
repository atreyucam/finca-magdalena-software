import { useEffect, useState } from "react";
import { toast } from "sonner";
import VentanaModal from "./ui/VentanaModal";
import Boton from "./ui/Boton";
import { Trash2 } from "lucide-react";
import { listarItemsInventario, listarTareaItems, configurarTareaItems } from "../api/apiClient";

function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function dedupeByItemId(list = []) {
  const byId = new Map();
  for (const row of list) {
    const id = Number(row?.item_id ?? row?.id);
    if (!Number.isInteger(id) || id <= 0) continue;
    byId.set(id, row);
  }
  return Array.from(byId.values());
}

export default function InsumosRequerimientosModal({ tareaId, open, onClose, onSaved }) {
  const [tab, setTab] = useState("Insumo");
  const [busqueda, setBusqueda] = useState("");
  const [inventario, setInventario] = useState([]);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!open || !tareaId) return;
    listarTareaItems(tareaId)
      .then((res) => {
        const rows = dedupeByItemId(toArray(res?.data));
        setItems(
          rows.map((i) => ({
            item_id: Number(i.item_id ?? i.id),
            nombre: i.nombre,
            categoria: i.categoria,
            unidad: i.unidad,
            cantidad_planificada: Number(i.cantidad_planificada) || 0,
          }))
        );
      })
      .catch(() => setItems([]));
  }, [open, tareaId]);

  useEffect(() => {
    if (!open) return;
    listarItemsInventario({ categoria: tab, activos: true })
      .then((res) => setInventario(toArray(res?.data)))
      .catch(() => setInventario([]));
  }, [open, tab]);

  const filtered = (Array.isArray(inventario) ? inventario : []).filter((i) =>
    (i?.nombre || "").toLowerCase().includes(busqueda.toLowerCase())
  );
  const yaExiste = (id) => items.some((i) => Number(i.item_id) === Number(id));

  const agregar = (it) => {
    if (yaExiste(it.id)) return;
    setItems((prev) => [
      ...prev,
      {
        item_id: Number(it.id),
        nombre: it.nombre,
        categoria: it.categoria || tab,
        unidad: it.unidad,
        cantidad_planificada: 1,
      },
    ]);
  };

  const guardar = async () => {
    try {
      const payloadMap = new Map();
      for (const i of items) {
        const itemId = Number(i.item_id);
        const cantidad = Number(i.cantidad_planificada);
        if (!Number.isInteger(itemId) || itemId <= 0) continue;
        if (!Number.isFinite(cantidad) || cantidad <= 0) continue;
        payloadMap.set(itemId, { item_id: itemId, cantidad_planificada: cantidad });
      }

      await configurarTareaItems(tareaId, { items: Array.from(payloadMap.values()) });
      toast.success("Recursos guardados");
      onSaved?.();
      onClose();
    } catch { toast.error("Error al guardar"); }
  };

  return (
    <VentanaModal abierto={open} cerrar={onClose} titulo="Gestionar Recursos" footer={
        <>
            <Boton variante="fantasma" onClick={onClose}>Cancelar</Boton>
            <Boton onClick={guardar}>Guardar Cambios</Boton>
        </>
    } ancho="max-w-4xl">
        <div className="flex gap-2 mb-4">
            {["Insumo", "Herramienta", "Equipo"].map(t => (
                <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{t}</button>
            ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[400px]">
            <div className="border rounded-xl flex flex-col overflow-hidden">
                <div className="p-3 border-b bg-slate-50"><input placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full bg-white border rounded-lg px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"/></div>
                <div className="flex-1 overflow-y-auto p-2">
                    {filtered.map(i => (
                        <div key={i.id} onClick={() => agregar(i)} className={`p-2 flex justify-between items-center rounded-lg cursor-pointer ${yaExiste(i.id) ? "opacity-50" : "hover:bg-slate-50"}`}>
                            <span className="text-sm font-medium">{i.nombre}</span>
                            <span className="text-xs text-slate-500">{i.stock_actual} disp.</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="border rounded-xl flex flex-col overflow-hidden bg-slate-50/50">
                <div className="p-3 border-b bg-white font-bold text-xs uppercase text-slate-500">Seleccionados</div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {items.filter(i => i.categoria === tab).map((i, idx) => (
                        <div key={`${i.item_id}-${idx}`} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                            <span className="flex-1 text-sm font-medium">{i.nombre}</span>
                            <input type="number" value={i.cantidad_planificada} onChange={e => setItems(prev => prev.map(x => Number(x.item_id) === Number(i.item_id) ? {...x, cantidad_planificada: e.target.value} : x))} className="w-16 text-center border rounded py-1 text-sm"/>
                            <span className="text-xs text-slate-500 w-8">{i.unidad}</span>
                            <button onClick={() => setItems(prev => prev.filter(x => Number(x.item_id) !== Number(i.item_id)))} className="text-rose-400 hover:text-rose-600"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </VentanaModal>
  );
}
