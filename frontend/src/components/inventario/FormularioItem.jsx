import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Boton from "../ui/Boton";
import { crearItemInventario } from "../../api/apiClient";

export default function FormularioItem({ unidades = [], alCancelar, alGuardar }) {
  const [guardando, setGuardando] = useState(false);
  
  // Estado inicial
  const [form, setForm] = useState({
    nombre: "",
    categoria: "Insumo",
    unidad_codigo: "",
    stock_inicial: "",
    stock_minimo: "",
    // Meta Insumos
    ingrediente_activo: "",
    formulacion: "",
    proveedor: "",
    // FEFO
    codigo_lote_proveedor: "",
    fecha_vencimiento: "",
  });

  const esInsumo = form.categoria === "Insumo";

  // Pre-seleccionar primera unidad
  useEffect(() => {
    if (!form.unidad_codigo && unidades.length > 0) {
      setForm((f) => ({ ...f, unidad_codigo: unidades[0].codigo }));
    }
  }, [unidades]);

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
  };
const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Validaciones básicas
    if (!form.nombre.trim()) return toast.error("El nombre es obligatorio");

    // 🔍 DEBUG: Ver qué unidades están llegando
    console.log("🔍 Lista de Unidades recibida:", unidades);
    console.log("🔍 Código seleccionado:", form.unidad_codigo);

    // 2. Encontrar el objeto unidad completo
    const unidadObj = unidades.find((u) => u.codigo === form.unidad_codigo);

    // Validación visual (Toast) y por consola
    if (!unidadObj) {
      console.error("❌ No se encontró la unidad con código:", form.unidad_codigo);
      return toast.error("Seleccione una unidad válida de la lista");
    }

    if (!unidadObj.id) {
      console.error("❌ La unidad encontrada no tiene ID:", unidadObj);
      return toast.error("Error crítico: La unidad seleccionada no tiene ID. Avise a soporte.");
    }

    // 3. Validar lotes solo si es Insumo y hay stock
    if (esInsumo && Number(form.stock_inicial) > 0) {
        if (!form.codigo_lote_proveedor) return toast.error("Falta el código de lote");
        if (!form.fecha_vencimiento) return toast.error("Falta la fecha de vencimiento");
    }

    // 4. Construir Payload
    const payload = {
      nombre: form.nombre.trim(),
      categoria: form.categoria,
      unidad_id: unidadObj.id, // ✅ Esto es lo más importante
      stock_inicial: Number(form.stock_inicial || 0),
      stock_minimo: Number(form.stock_minimo || 0),
      
      // Meta
      ingrediente_activo: esInsumo ? form.ingrediente_activo : null,
      formulacion: esInsumo ? form.formulacion : null,
      proveedor: esInsumo ? form.proveedor : null,

      // Lote Inicial
      lote_inicial: (esInsumo && Number(form.stock_inicial) > 0) ? {
          codigo_lote_proveedor: form.codigo_lote_proveedor,
          fecha_vencimiento: form.fecha_vencimiento
      } : null
    };

    console.log("🚀 Enviando Payload al backend:", payload);

    try {
      setGuardando(true);
      await crearItemInventario(payload);
      
      // ✅ Éxito
      toast.success("¡Ítem guardado correctamente!");
      console.log("✅ Respuesta exitosa del backend");
      alGuardar?.(); 

    } catch (err) {
      console.error("❌ Error al guardar:", err);
      // Fallback por si el toast falla
      const mensaje = err?.response?.data?.message || err.message || "Error desconocido";
      toast.error(mensaje);
      // alert(`Error: ${mensaje}`); // Descomenta esto si sigues sin ver el toast
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Input label="Nombre del ítem *" value={form.nombre} onChange={handleChange("nombre")} autoFocus required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select label="Categoría" value={form.categoria} onChange={handleChange("categoria")}>
          <option value="Insumo">Insumo</option>
          <option value="Herramienta">Herramienta</option>
          <option value="Equipo">Equipo</option>
        </Select>

        <Select label="Unidad *" value={form.unidad_codigo} onChange={handleChange("unidad_codigo")}>
            {unidades.map(u => (
                <option key={u.id} value={u.codigo}>{u.nombre} ({u.codigo})</option>
            ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Stock Inicial" type="number" min="0" step="0.01" value={form.stock_inicial} onChange={handleChange("stock_inicial")} />
        <Input label="Stock Mínimo" type="number" min="0" step="0.01" value={form.stock_minimo} onChange={handleChange("stock_minimo")} />
      </div>

      {esInsumo && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase">Detalles del Insumo</h4>
            <div className="grid grid-cols-2 gap-4">
                <Input label="Ingrediente Activo" value={form.ingrediente_activo} onChange={handleChange("ingrediente_activo")} />
                <Input label="Formulación" value={form.formulacion} onChange={handleChange("formulacion")} />
            </div>
            <Input label="Proveedor" value={form.proveedor} onChange={handleChange("proveedor")} />

            {/* FEFO Fields */}
            {Number(form.stock_inicial) > 0 && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 grid grid-cols-2 gap-4">
                     <div className="col-span-2 text-xs font-bold text-amber-800 uppercase">Lote Inicial Obligatorio</div>
                     <Input label="Código Lote / Serie" value={form.codigo_lote_proveedor} onChange={handleChange("codigo_lote_proveedor")} required />
                     <Input label="Vencimiento" type="date" value={form.fecha_vencimiento} onChange={handleChange("fecha_vencimiento")} required />
                </div>
            )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Boton type="button" variante="fantasma" onClick={alCancelar} disabled={guardando}>Cancelar</Boton>
<Boton 
    tipo="submit" 
    variante="exito" 
    cargando={guardando}
  >
    Guardar
  </Boton>
  </div>
    </form>
  );
}