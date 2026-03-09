import { useEffect, useMemo, useState } from "react";
import { Box, X } from "lucide-react";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Boton from "../ui/Boton";
import useToast from "../../hooks/useToast";
import { crearItemInventario } from "../../api/apiClient";

function asText(value) {
  return String(value ?? "").trim();
}

export default function FormularioItemRapidoCompra({ unidades = [], alCancelar, alCreado }) {
  const toast = useToast();
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    categoria: "Insumo",
    unidad_codigo: "",
    stock_minimo: "",
    fabricante: "",
  });

  const unidadSeleccionada = useMemo(
    () => unidades.find((u) => String(u.codigo) === String(form.unidad_codigo)),
    [unidades, form.unidad_codigo]
  );

  useEffect(() => {
    if (!form.unidad_codigo && unidades.length > 0) {
      setForm((prev) => ({ ...prev, unidad_codigo: unidades[0].codigo }));
    }
  }, [form.unidad_codigo, unidades]);

  const onChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const submit = async (e) => {
    e.preventDefault();

    const nombre = asText(form.nombre);
    if (!nombre) {
      toast.error("El nombre del item es obligatorio");
      return;
    }

    if (!unidadSeleccionada?.id) {
      toast.error("Selecciona una unidad valida");
      return;
    }

    const stockMinimo = Number(form.stock_minimo || 0);
    if (!Number.isFinite(stockMinimo) || stockMinimo < 0) {
      toast.error("Stock minimo invalido");
      return;
    }

    const payload = {
      nombre,
      categoria: form.categoria,
      unidad_id: unidadSeleccionada.id,
      stock_minimo: stockMinimo,
      stock_inicial: 0,
      fabricante:
        form.categoria === "Insumo" ? asText(form.fabricante) || null : null,
    };

    try {
      setGuardando(true);
      const res = await crearItemInventario(payload);
      toast.success("Item de inventario creado");
      alCreado?.(res?.data);
    } catch (error) {
      toast.error(error?.response?.data?.message || "No se pudo crear el item");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="w-full max-w-[820px] flex flex-col">
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-200 flex items-start justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Box size={22} strokeWidth={2.3} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              Nuevo item de inventario
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Se creará con stock inicial 0 y esta compra aumentará el stock.
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

      <form onSubmit={submit} className="space-y-4 px-4 sm:px-6 lg:px-8 py-5">
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

          <Select
            label="Unidad *"
            value={form.unidad_codigo}
            onChange={onChange("unidad_codigo")}
            required
          >
            <option value="" disabled>
              Selecciona unidad
            </option>
            {unidades.map((u) => (
              <option key={u.id} value={u.codigo}>
                {u.nombre} ({u.codigo})
              </option>
            ))}
          </Select>
        </div>

        <Input
          label="Stock minimo"
          type="number"
          min="0"
          step="0.001"
          value={form.stock_minimo}
          onChange={onChange("stock_minimo")}
        />

        {form.categoria === "Insumo" && (
          <Input
            label="Fabricante"
            value={form.fabricante}
            onChange={onChange("fabricante")}
            placeholder="Opcional"
          />
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Stock inicial: <span className="font-semibold">0</span>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Boton type="button" variante="fantasma" onClick={alCancelar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton tipo="submit" variante="exito" cargando={guardando}>
            Crear item
          </Boton>
        </div>
      </form>
    </div>
  );
}
