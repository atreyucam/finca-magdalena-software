import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, UserPlus, Box, Save } from "lucide-react";
import {
  crearCompra,
  listarItemsInventario,
  listarProveedores,
} from "../api/apiClient";
import useToast from "../hooks/useToast";
import useUnidades from "../hooks/useUnidades";
import Input from "../components/ui/Input";
import Boton from "../components/ui/Boton";
import LinkVolver from "../components/ui/LinkVolver";
import VentanaModal from "../components/ui/VentanaModal";
import FormularioProveedorRapido from "../components/compras/FormularioProveedorRapido";
import FormularioItemRapidoCompra from "../components/compras/FormularioItemRapidoCompra";

function hoyYmd() {
  return new Date().toISOString().slice(0, 10);
}

function rowFactory() {
  return {
    key: `${Date.now()}-${Math.random()}`,
    inventario_item_id: "",
    itemNombre: "",
    cantidad: "",
    costo_unitario: "",
  };
}

function money(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export default function NuevaCompra() {
  const navigate = useNavigate();
  const toast = useToast();
  const { unidades } = useUnidades();

  const [form, setForm] = useState({
    numero_factura: "",
    proveedor_id: "",
    fecha_compra: hoyYmd(),
    observacion: "",
  });
  const [busquedaProveedor, setBusquedaProveedor] = useState("");
  const [proveedores, setProveedores] = useState([]);
  const [cargandoProveedores, setCargandoProveedores] = useState(false);

  const [detalles, setDetalles] = useState([rowFactory()]);
  const [itemsCatalogo, setItemsCatalogo] = useState([]);
  const [cargandoItems, setCargandoItems] = useState(false);

  const [guardando, setGuardando] = useState(false);

  const [modalProveedorAbierto, setModalProveedorAbierto] = useState(false);
  const [modalItemAbierto, setModalItemAbierto] = useState(false);
  const [filaItemModal, setFilaItemModal] = useState(null);

  const itemsById = useMemo(
    () => new Map(itemsCatalogo.map((i) => [String(i.id), i])),
    [itemsCatalogo]
  );
  const itemsByName = useMemo(() => {
    const m = new Map();
    for (const it of itemsCatalogo) {
      m.set(String(it.nombre || "").trim().toLowerCase(), it);
    }
    return m;
  }, [itemsCatalogo]);

  const cargarProveedores = useCallback(async (q = "") => {
    try {
      setCargandoProveedores(true);
      const res = await listarProveedores({
        q,
        activos: "true",
        page: 1,
        pageSize: 60,
      });
      const list = res?.data?.data || [];
      setProveedores(Array.isArray(list) ? list : []);
    } catch (error) {
      toast.error("No se pudieron cargar proveedores");
    } finally {
      setCargandoProveedores(false);
    }
  }, [toast]);

  const cargarItems = useCallback(async () => {
    try {
      setCargandoItems(true);
      const res = await listarItemsInventario({
        q: "",
        categoria: "all",
        activos: "true",
        page: 1,
        pageSize: 500,
        limit: 500,
      });
      const payload = res?.data || {};
      const list = payload?.data || payload?.rows || payload?.items || [];
      const clean = (Array.isArray(list) ? list : [])
        .map((i) => ({
          id: i.id,
          nombre: i.nombre,
          categoria: i.categoria,
          unidad: i.unidad || "",
        }))
        .filter((i) => i.id && i.nombre);

      setItemsCatalogo(clean);
      return clean;
    } catch (error) {
      toast.error("No se pudo cargar el catálogo de inventario");
      return [];
    } finally {
      setCargandoItems(false);
    }
  }, [toast]);

  useEffect(() => {
    cargarItems();
  }, [cargarItems]);

  useEffect(() => {
    const tm = setTimeout(() => {
      cargarProveedores(busquedaProveedor);
    }, 250);
    return () => clearTimeout(tm);
  }, [busquedaProveedor, cargarProveedores]);

  const selectedIdsCount = useMemo(() => {
    const map = new Map();
    detalles.forEach((r) => {
      if (!r.inventario_item_id) return;
      const key = String(r.inventario_item_id);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [detalles]);

  const duplicados = useMemo(() => {
    const out = new Set();
    selectedIdsCount.forEach((count, key) => {
      if (count > 1) out.add(key);
    });
    return out;
  }, [selectedIdsCount]);

  const subtotalGeneral = useMemo(
    () =>
      round2(
        detalles.reduce((acc, row) => {
          const cantidad = Number(row.cantidad || 0);
          const costo = Number(row.costo_unitario || 0);
          if (!Number.isFinite(cantidad) || !Number.isFinite(costo)) return acc;
          return acc + cantidad * costo;
        }, 0)
      ),
    [detalles]
  );

  const totalGeneral = subtotalGeneral;

  const updateForm = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const addRow = () => {
    setDetalles((prev) => [...prev, rowFactory()]);
  };

  const removeRow = (index) => {
    setDetalles((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const updateRow = (index, patch) => {
    setDetalles((prev) => prev.map((r, idx) => (idx === index ? { ...r, ...patch } : r)));
  };

  const onItemInputChange = (index, value) => {
    const raw = String(value || "");
    const found = itemsByName.get(raw.trim().toLowerCase());

    if (!found) {
      updateRow(index, { itemNombre: raw, inventario_item_id: "" });
      return;
    }

    const repeated = detalles.some(
      (r, idx) => idx !== index && String(r.inventario_item_id) === String(found.id)
    );
    if (repeated) {
      toast.error("No se puede repetir el mismo item dentro de la compra");
      return;
    }

    updateRow(index, {
      itemNombre: found.nombre,
      inventario_item_id: String(found.id),
    });
  };

  const getRowSubtotal = (row) => {
    const cantidad = Number(row.cantidad || 0);
    const costo = Number(row.costo_unitario || 0);
    if (!Number.isFinite(cantidad) || !Number.isFinite(costo)) return 0;
    return round2(cantidad * costo);
  };

  const handleProveedorCreado = async (proveedor) => {
    setModalProveedorAbierto(false);
    if (!proveedor?.id) return;

    setProveedores((prev) => {
      const rest = prev.filter((p) => String(p.id) !== String(proveedor.id));
      return [proveedor, ...rest];
    });
    setForm((prev) => ({ ...prev, proveedor_id: String(proveedor.id) }));
    setBusquedaProveedor(proveedor.nombre || "");
  };

  const abrirModalItem = (index) => {
    setFilaItemModal(index);
    setModalItemAbierto(true);
  };

  const handleItemCreado = async (item) => {
    setModalItemAbierto(false);
    const createdId = item?.id ? String(item.id) : null;
    let selected = null;

    if (createdId) {
      const catalogo = await cargarItems();
      selected = catalogo.find((it) => String(it.id) === createdId) || null;
    }

    if (!selected && createdId) {
      const unidadCodigo =
        unidades.find((u) => String(u.id) === String(item?.unidad_id))?.codigo || "";
      selected = {
        id: item.id,
        nombre: item.nombre,
        categoria: item.categoria,
        unidad: unidadCodigo,
      };
      setItemsCatalogo((prev) => {
        const rest = prev.filter((x) => String(x.id) !== String(item.id));
        return [selected, ...rest];
      });
    }

    if (selected && filaItemModal !== null) {
      updateRow(filaItemModal, {
        inventario_item_id: String(selected.id),
        itemNombre: selected.nombre,
      });
    }
    setFilaItemModal(null);
  };

  const validateAndBuildPayload = () => {
    const numeroFactura = String(form.numero_factura || "").trim().toUpperCase();
    if (!numeroFactura) throw new Error("El numero de factura es obligatorio");

    const proveedorId = Number(form.proveedor_id);
    if (!Number.isInteger(proveedorId) || proveedorId <= 0) {
      throw new Error("Selecciona un proveedor");
    }

    if (!Array.isArray(detalles) || detalles.length === 0) {
      throw new Error("La compra debe incluir al menos un item");
    }

    const normalizados = detalles.map((row, idx) => {
      const itemId = Number(row.inventario_item_id);
      if (!Number.isInteger(itemId) || itemId <= 0) {
        throw new Error(`Selecciona un item valido en la fila ${idx + 1}`);
      }

      const cantidad = Number(row.cantidad);
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        throw new Error(`Cantidad invalida en la fila ${idx + 1}`);
      }

      const costo = Number(row.costo_unitario);
      if (!Number.isFinite(costo) || costo <= 0) {
        throw new Error(`Costo unitario invalido en la fila ${idx + 1}`);
      }

      return {
        inventario_item_id: itemId,
        cantidad,
        costo_unitario: costo,
      };
    });

    const uniq = new Set(normalizados.map((d) => d.inventario_item_id));
    if (uniq.size !== normalizados.length) {
      throw new Error("No se puede repetir un item en varias filas");
    }

    return {
      numero_factura: numeroFactura,
      proveedor_id: proveedorId,
      fecha_compra: form.fecha_compra || hoyYmd(),
      observacion: String(form.observacion || "").trim() || null,
      detalles: normalizados,
      subtotal: subtotalGeneral,
      total: totalGeneral,
    };
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = validateAndBuildPayload();
      setGuardando(true);
      const res = await crearCompra(payload);
      const compra = res?.data;
      toast.success("Compra registrada correctamente");
      if (compra?.id) {
        navigate(`/owner/compras/${compra.id}`);
        return;
      }
      navigate("/owner/compras");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || "No se pudo registrar la compra");
      } else {
        toast.error(error?.response?.data?.message || "No se pudo registrar la compra");
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        <div className="mb-6">
          <LinkVolver to="/owner/compras" label="Volver a compras" />
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Nueva compra</h1>
          <p className="text-slate-500 font-medium">
            La compra se registrará confirmada e impactará inventario de inmediato.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-7">
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
                Cabecera
              </h2>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Input
                label="Numero de factura *"
                value={form.numero_factura}
                onChange={updateForm("numero_factura")}
                placeholder="Ej: FAC-00124"
                required
              />

              <Input
                label="Fecha de compra *"
                type="date"
                value={form.fecha_compra}
                onChange={updateForm("fecha_compra")}
                required
              />

              <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    label="Buscar proveedor"
                    value={busquedaProveedor}
                    onChange={(e) => setBusquedaProveedor(e.target.value)}
                    placeholder="Nombre, RUC o correo"
                  />
                  <div className="w-full">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                      Proveedor *
                    </label>
                    <select
                      value={form.proveedor_id}
                      onChange={(e) => setForm((prev) => ({ ...prev, proveedor_id: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                      required
                    >
                      <option value="">
                        {cargandoProveedores ? "Cargando..." : "Selecciona proveedor"}
                      </option>
                      {proveedores.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                          {p.ruc ? ` (${p.ruc})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="self-end">
                  <Boton
                    type="button"
                    variante="outline"
                    onClick={() => setModalProveedorAbierto(true)}
                    icono={UserPlus}
                    className="w-full lg:w-auto"
                  >
                    Nuevo proveedor
                  </Boton>
                </div>
              </div>

              <div className="lg:col-span-2">
                <Input
                  label="Observacion"
                  value={form.observacion}
                  onChange={updateForm("observacion")}
                  placeholder="Opcional"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 rounded-t-2xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
                Detalle de compra
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <Boton
                  type="button"
                  variante="outline"
                  onClick={() => abrirModalItem(detalles.length - 1)}
                  icono={Box}
                >
                  Crear item inventario
                </Boton>
                <Boton type="button" variante="neutro" onClick={addRow} icono={Plus}>
                  Agregar fila
                </Boton>
              </div>
            </div>

            <div className="p-4 overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm text-slate-700">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                    <th className="text-left py-2 pr-2">Item</th>
                    <th className="text-left py-2 px-2">Categoria</th>
                    <th className="text-left py-2 px-2">Unidad</th>
                    <th className="text-right py-2 px-2">Cantidad</th>
                    <th className="text-right py-2 px-2">Costo unitario</th>
                    <th className="text-right py-2 px-2">Subtotal</th>
                    <th className="text-right py-2 pl-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {detalles.map((row, idx) => {
                    const item = itemsById.get(String(row.inventario_item_id)) || null;
                    const repeated = row.inventario_item_id && duplicados.has(String(row.inventario_item_id));
                    const selectedByOthers = new Set(
                      detalles
                        .filter((_, i) => i !== idx)
                        .map((r) => String(r.inventario_item_id))
                        .filter(Boolean)
                    );
                    const options = itemsCatalogo.filter(
                      (it) =>
                        !selectedByOthers.has(String(it.id)) ||
                        String(row.inventario_item_id) === String(it.id)
                    );

                    return (
                      <tr key={row.key} className="border-b border-slate-100 last:border-b-0">
                        <td className="py-2 pr-2 align-top">
                          <div className="flex items-start gap-2">
                            <div className="w-full">
                              <input
                                list={`items-datalist-${row.key}`}
                                className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 ${
                                  repeated
                                    ? "border-rose-300 focus:ring-rose-200"
                                    : "border-slate-300 focus:ring-emerald-200"
                                }`}
                                placeholder={cargandoItems ? "Cargando items..." : "Busca y selecciona item"}
                                value={row.itemNombre}
                                onChange={(e) => onItemInputChange(idx, e.target.value)}
                              />
                              <datalist id={`items-datalist-${row.key}`}>
                                {options.map((it) => (
                                  <option key={it.id} value={it.nombre}>
                                    {it.categoria} - {it.unidad}
                                  </option>
                                ))}
                              </datalist>
                              {repeated && (
                                <p className="mt-1 text-xs text-rose-600 font-medium">
                                  Item repetido. Debe ser único dentro de la compra.
                                </p>
                              )}
                            </div>
                            <Boton
                              type="button"
                              variante="fantasma"
                              className="!px-2 !py-2"
                              onClick={() => abrirModalItem(idx)}
                              title="Crear item"
                            >
                              <Plus size={14} />
                            </Boton>
                          </div>
                        </td>

                        <td className="py-2 px-2 align-top">{item?.categoria || "—"}</td>
                        <td className="py-2 px-2 align-top">{item?.unidad || "—"}</td>

                        <td className="py-2 px-2 align-top">
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-right text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                            value={row.cantidad}
                            onChange={(e) => updateRow(idx, { cantidad: e.target.value })}
                          />
                        </td>

                        <td className="py-2 px-2 align-top">
                          <input
                            type="number"
                            min="0"
                            step="0.0001"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-right text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                            value={row.costo_unitario}
                            onChange={(e) => updateRow(idx, { costo_unitario: e.target.value })}
                          />
                        </td>

                        <td className="py-2 px-2 align-top text-right font-mono font-bold text-slate-900">
                          {money(getRowSubtotal(row))}
                        </td>

                        <td className="py-2 pl-2 align-top text-right">
                          <Boton
                            type="button"
                            variante="fantasma"
                            className="!px-2.5 !py-2 border-rose-200 text-rose-700 hover:!bg-rose-50"
                            onClick={() => removeRow(idx)}
                            disabled={detalles.length <= 1}
                            title="Eliminar fila"
                          >
                            <Trash2 size={14} />
                          </Boton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 min-w-[280px]">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono">{money(subtotalGeneral)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-base font-black text-slate-900">
                <span>Total</span>
                <span className="font-mono">{money(totalGeneral)}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
            <Boton type="button" variante="fantasma" onClick={() => navigate("/owner/compras")}>
              Cancelar
            </Boton>
            <Boton tipo="submit" variante="primario" cargando={guardando}>
              <Save size={16} className="mr-2" />
              Registrar compra confirmada
            </Boton>
          </div>
        </form>
      </div>

      <VentanaModal abierto={modalProveedorAbierto} cerrar={() => setModalProveedorAbierto(false)} titulo={null}>
        <FormularioProveedorRapido
          alCancelar={() => setModalProveedorAbierto(false)}
          alCreado={handleProveedorCreado}
        />
      </VentanaModal>

      <VentanaModal abierto={modalItemAbierto} cerrar={() => setModalItemAbierto(false)} titulo={null}>
        <FormularioItemRapidoCompra
          unidades={unidades}
          alCancelar={() => setModalItemAbierto(false)}
          alCreado={handleItemCreado}
        />
      </VentanaModal>
    </section>
  );
}
