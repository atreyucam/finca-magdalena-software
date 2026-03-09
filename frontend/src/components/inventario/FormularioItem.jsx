import { useEffect, useMemo, useState } from "react";
import useToast from "../../hooks/useToast";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Boton from "../ui/Boton";
import { X, Box } from "lucide-react";
import { crearItemInventario, editarItemInventario } from "../../api/apiClient";

export default function FormularioItem({ unidades = [], item = null, alCancelar, alGuardar }) {
  const notify = useToast();
  const [guardando, setGuardando] = useState(false);
  const esEdicion = !!item?.id;

  const [form, setForm] = useState({
    nombre: item?.nombre || "",
    categoria: item?.categoria || "Insumo",
    unidad_codigo: item?.unidad || "",
    stock_inicial: "",
    stock_minimo: item?.stock_minimo ?? "",
    fabricante: item?.fabricante || "",
    stock_actual: item?.stock_actual ?? "",
  });

  useEffect(() => {
    setForm({
      nombre: item?.nombre || "",
      categoria: item?.categoria || "Insumo",
      unidad_codigo: item?.unidad || "",
      stock_inicial: "",
      stock_minimo: item?.stock_minimo ?? "",
      fabricante: item?.fabricante || "",
      stock_actual: item?.stock_actual ?? "",
    });
  }, [item]);

  useEffect(() => {
    if (!form.unidad_codigo && unidades.length > 0) {
      setForm((prev) => ({ ...prev, unidad_codigo: unidades[0].codigo }));
    }
  }, [form.unidad_codigo, unidades]);

  const unidadObj = useMemo(
    () => unidades.find((u) => u.codigo === form.unidad_codigo),
    [form.unidad_codigo, unidades]
  );

  const esInsumo = form.categoria === "Insumo";

  const onChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nombre = String(form.nombre || "").trim();
    if (!nombre) return notify.error("El nombre es obligatorio");
    if (!unidadObj?.id) return notify.error("Unidad invalida");

    const stockMinimo = Number(form.stock_minimo || 0);
    if (!Number.isFinite(stockMinimo) || stockMinimo < 0) {
      return notify.error("Stock minimo invalido");
    }

    const payloadBase = {
      nombre,
      categoria: form.categoria,
      unidad_id: unidadObj.id,
      stock_minimo: stockMinimo,
      fabricante: esInsumo ? String(form.fabricante || "").trim() || null : null,
    };

    if (!esEdicion) {
      const stockInicial = Number(form.stock_inicial || 0);
      if (!Number.isFinite(stockInicial) || stockInicial < 0) {
        return notify.error("Stock inicial invalido");
      }
      payloadBase.stock_inicial = stockInicial;
    }

    try {
      setGuardando(true);
      if (esEdicion) {
        await editarItemInventario(item.id, payloadBase);
        notify.success("Item actualizado");
      } else {
        await crearItemInventario(payloadBase);
        notify.success("Item creado");
      }
      alGuardar?.();
    } catch (err) {
      notify.error(err?.response?.data?.message || "Error al guardar item");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="w-full max-w-[900px] flex flex-col">
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-200 flex items-start justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Box size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              {esEdicion ? "Editar item" : "Registrar nuevo item"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Dominio simplificado de inventario sin lotes, vencimientos ni formulaciones.
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

      <form onSubmit={handleSubmit} className="space-y-6 px-4 sm:px-6 lg:px-8 py-5">
        <Input
          label="Nombre del item *"
          value={form.nombre}
          onChange={onChange("nombre")}
          autoFocus
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Categoria" value={form.categoria} onChange={onChange("categoria")}>
            <option value="Insumo">Insumo</option>
            <option value="Herramienta">Herramienta</option>
            <option value="Equipo">Equipo</option>
          </Select>

          <Select label="Unidad *" value={form.unidad_codigo} onChange={onChange("unidad_codigo")}>
            {unidades.map((u) => (
              <option key={u.id} value={u.codigo}>
                {u.nombre} ({u.codigo})
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {esEdicion ? (
            <Input label="Stock total (solo lectura)" value={String(form.stock_actual ?? "")} disabled />
          ) : (
            <Input
              label="Stock inicial"
              type="number"
              min="0"
              step="0.001"
              value={form.stock_inicial}
              onChange={onChange("stock_inicial")}
            />
          )}

          <Input
            label="Stock minimo"
            type="number"
            min="0"
            step="0.001"
            value={form.stock_minimo}
            onChange={onChange("stock_minimo")}
          />
        </div>

        {esInsumo && (
          <Input
            label="Fabricante"
            value={form.fabricante}
            onChange={onChange("fabricante")}
            placeholder="Ej: Ecuaquimica"
          />
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Boton type="button" variante="fantasma" onClick={alCancelar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton tipo="submit" variante="exito" cargando={guardando}>
            {esEdicion ? "Guardar cambios" : "Crear item"}
          </Boton>
        </div>
      </form>
    </div>
  );
}
