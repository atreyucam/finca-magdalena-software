// frontend/src/components/inventario/FormularioItem.jsx
import { useEffect, useMemo, useState } from "react";
import useToast from "../../hooks/useToast";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Boton from "../ui/Boton";
import { X, Box } from "lucide-react";
import { crearItemInventario, editarItemInventario } from "../../api/apiClient";

export default function FormularioItem({ unidades = [], item = null, alCancelar, alGuardar, mostrarTitulo = false }) {
  const notify = useToast();
  const [guardando, setGuardando] = useState(false);

  const esEdicion = !!item?.id;

  const [form, setForm] = useState({
    nombre: item?.nombre || "",
    categoria: item?.categoria || "Insumo",
    unidad_codigo: item?.unidad || "",
    stock_inicial: "", // SOLO create
    stock_minimo: item?.stock_minimo ?? "",

    // Meta (solo Insumo)
    ingrediente_activo: item?.ingrediente_activo || "",
    formulacion: item?.formulacion || "",

    // ✅ Fabricante: create y edit (pero en edit SOLO corrección)
    proveedor: item?.proveedor || "",

    // Lote inicial (solo create + stock_inicial > 0)
    codigo_lote_proveedor: "",
    fecha_vencimiento: "",

    // stock solo lectura (edición)
    stock_actual: item?.stock_actual ?? "",
  });

  // Re-sincronizar cuando cambias item (modal con otro ítem)
  useEffect(() => {
    setForm({
      nombre: item?.nombre || "",
      categoria: item?.categoria || "Insumo",
      unidad_codigo: item?.unidad || "",
      stock_inicial: "",
      stock_minimo: item?.stock_minimo ?? "",
      ingrediente_activo: item?.ingrediente_activo || "",
      formulacion: item?.formulacion || "",
      proveedor: item?.proveedor || "",
      codigo_lote_proveedor: "",
      fecha_vencimiento: "",
      stock_actual: item?.stock_actual ?? "",
    });
  }, [item]);

  const esInsumo = form.categoria === "Insumo";

  // Preseleccionar unidad si no hay
  useEffect(() => {
    if (!form.unidad_codigo && unidades.length > 0) {
      setForm((f) => ({ ...f, unidad_codigo: unidades[0].codigo }));
    }
  }, [unidades, form.unidad_codigo]);

  const unidadObj = useMemo(
    () => unidades.find((u) => u.codigo === form.unidad_codigo),
    [unidades, form.unidad_codigo]
  );

  const requiereLoteInicial = !esEdicion && esInsumo && Number(form.stock_inicial || 0) > 0;

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const limpiarString = (v) => (typeof v === "string" ? v.trim() : v);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ===== Validaciones =====
    const nombreLimpio = limpiarString(form.nombre);
    if (!nombreLimpio) return notify.error("El nombre es obligatorio");

    if (!unidadObj) return notify.error("Seleccione una unidad válida");
    if (!unidadObj?.id) return notify.error("Unidad inválida (sin ID)");

    const stockMin = Number(form.stock_minimo || 0);
    if (Number.isNaN(stockMin) || stockMin < 0) {
      return notify.error("Stock mínimo inválido");
    }

    if (!esEdicion) {
      const stockIni = Number(form.stock_inicial || 0);
      if (Number.isNaN(stockIni) || stockIni < 0) {
        return notify.error("Stock inicial inválido");
      }

      if (requiereLoteInicial) {
        if (!limpiarString(form.codigo_lote_proveedor)) return notify.error("Falta el código de lote");
        if (!form.fecha_vencimiento) return notify.error("Falta la fecha de vencimiento");
      }
    }

    // Fabricante / proveedor: validación suave (solo insumo)
    const proveedorLimpio = limpiarString(form.proveedor);
    if (esInsumo && proveedorLimpio && proveedorLimpio.length < 2) {
      return notify.error("Fabricante inválido");
    }

    // ===== Payload CREATE =====
    const payloadCreate = {
      nombre: nombreLimpio,
      categoria: form.categoria,
      unidad_id: unidadObj.id,

      stock_inicial: Number(form.stock_inicial || 0),
      stock_minimo: stockMin,

      ingrediente_activo: esInsumo ? (limpiarString(form.ingrediente_activo) || null) : null,
      formulacion: esInsumo ? (limpiarString(form.formulacion) || null) : null,
      proveedor: esInsumo ? (proveedorLimpio || null) : null,

      lote_inicial: requiereLoteInicial
  ? {
      codigo_lote_proveedor: limpiarString(form.codigo_lote_proveedor).toUpperCase(),
      fecha_vencimiento: form.fecha_vencimiento,
    }
  : null,

    };

    // ===== Payload EDIT =====
    // ✅ aquí SÍ enviamos proveedor para corrección de redacción
    const payloadEdit = {
      nombre: nombreLimpio,
      categoria: form.categoria,
      unidad_id: unidadObj.id,
      stock_minimo: stockMin,

      ingrediente_activo: esInsumo ? (limpiarString(form.ingrediente_activo) || null) : null,
      formulacion: esInsumo ? (limpiarString(form.formulacion) || null) : null,
      proveedor: esInsumo ? (proveedorLimpio || null) : null,
    };

    try {
      setGuardando(true);

      if (esEdicion) {
        await editarItemInventario(item.id, payloadEdit);
        notify.success("¡Ítem actualizado correctamente!");
      } else {
        await crearItemInventario(payloadCreate);
        notify.success("¡Ítem creado correctamente!");
      }

      alGuardar?.();
    } catch (err) {
      console.error("❌ Error al guardar ítem:", err);
      const mensaje = err?.response?.data?.message || err.message || "Error desconocido";
      notify.error(mensaje);
    } finally {
      setGuardando(false);
    }
  };

    return (
    <div className="w-full max-w-[900px] flex flex-col">

      {/* ✅ HEADER BONITO (igual estilo que Finca/Lote/Cosecha) */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-200 flex items-start justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            {/* Iconito simple sin importar nuevos icons */}
            <Box size={22} strokeWidth={2.5}></Box>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              {esEdicion ? "Editar ítem" : "Registrar nuevo ítem"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {esEdicion
                ? "Corrige datos del ítem. El stock se gestiona en Ajustes."
                : "Crea un ítem para registrar stock, mínimos y detalles."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={alCancelar}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Cerrar"
          title="Cerrar"
        >
          <X size={20} />
        </button>
      </div>

      {/* ✅ BODY CON PADDING */}
      <form onSubmit={handleSubmit} className="space-y-6 px-4 sm:px-6 lg:px-8 py-5">
        {/* ❌ Quitamos el bloque mostrarTitulo porque ya hay header pro */}
        {/* Si quieres conservarlo, lo puedes eliminar por completo */}

        {/* Nombre */}
        <Input
          label="Nombre del ítem *"
          value={form.nombre}
          onChange={handleChange("nombre")}
          autoFocus
          required
        />

        {/* Categoría + Unidad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Categoría" value={form.categoria} onChange={handleChange("categoria")}>
            <option value="Insumo">Insumo</option>
            <option value="Herramienta">Herramienta</option>
            <option value="Equipo">Equipo</option>
          </Select>

          <Select label="Unidad *" value={form.unidad_codigo} onChange={handleChange("unidad_codigo")}>
            {unidades.map((u) => (
              <option key={u.id} value={u.codigo}>
                {u.nombre} ({u.codigo})
              </option>
            ))}
          </Select>
        </div>

        {/* Stocks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {esEdicion ? (
            <Input label="Stock actual (solo lectura)" value={String(form.stock_actual ?? "")} disabled />
          ) : (
            <Input
              label="Stock Inicial"
              type="number"
              min="0"
              step="0.001"
              value={form.stock_inicial}
              onChange={handleChange("stock_inicial")}
            />
          )}

          <Input
            label="Stock Mínimo"
            type="number"
            min="0"
            step="0.001"
            value={form.stock_minimo}
            onChange={handleChange("stock_minimo")}
          />
        </div>

        {/* Detalles del insumo */}
        {esInsumo && (
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Detalles del insumo
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Ingrediente activo"
                value={form.ingrediente_activo}
                onChange={handleChange("ingrediente_activo")}
              />
              <Input
                label="Formulación"
                value={form.formulacion}
                onChange={handleChange("formulacion")}
              />
            </div>

            <Input
              label={esEdicion ? "Fabricante (solo corrección)" : "Fabricante"}
              value={form.proveedor}
              onChange={handleChange("proveedor")}
              placeholder={esEdicion ? "Corrige el texto si estaba mal escrito" : "Ej: Ecuaquímica"}
            />

            {esEdicion && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <span className="font-bold">⚠️ Importante:</span> cambiar el fabricante aquí{" "}
                <span className="font-semibold">actualiza el ítem</span> y se verá reflejado en{" "}
                <span className="font-semibold">todos los lotes</span>. Úsalo solo para{" "}
                <span className="font-semibold">corregir digitación</span>. Si es otro fabricante real,
                crea un <span className="font-semibold">nuevo ítem</span>.
              </div>
            )}

            {/* Lote inicial (solo create) */}
            {!esEdicion && Number(form.stock_inicial || 0) > 0 && (
              <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 text-xs font-bold text-amber-800 uppercase tracking-widest">
                  Lote inicial (obligatorio si hay stock inicial)
                </div>

                <Input
                  label="Código de lote (proveedor)"
                  value={form.codigo_lote_proveedor}
                  placeholder="Ej: A-001"
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      codigo_lote_proveedor: e.target.value.toUpperCase(),
                    }))
                  }
                  required={requiereLoteInicial}
                />

                <Input
                  label="Vencimiento"
                  type="date"
                  value={form.fecha_vencimiento}
                  onChange={handleChange("fecha_vencimiento")}
                  required={requiereLoteInicial}
                />
              </div>
            )}

            {esEdicion && (
              <div className="text-xs text-slate-500">
                Los <span className="font-semibold">lotes</span> se agregan desde{" "}
                <span className="font-semibold">Ajustar → Entrada</span>.
              </div>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Boton type="button" variante="fantasma" onClick={alCancelar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton tipo="submit" variante="exito" cargando={guardando}>
            {esEdicion ? "Guardar cambios" : "Crear ítem"}
          </Boton>
        </div>
      </form>
    </div>
  );

}
