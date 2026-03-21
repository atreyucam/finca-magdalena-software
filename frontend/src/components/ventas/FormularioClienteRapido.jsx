import { useState } from "react";
import { UserRound, X } from "lucide-react";
import Input from "../ui/Input";
import Boton from "../ui/Boton";
import useToast from "../../hooks/useToast";
import { crearCliente } from "../../api/apiClient";

function normalize(value) {
  return String(value ?? "").trim();
}

export default function FormularioClienteRapido({ alCancelar, alCreado }) {
  const toast = useToast();
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    identificacion: "",
    telefono: "",
    correo: "",
    direccion: "",
  });

  const onChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const submit = async (e) => {
    e.preventDefault();

    const nombre = normalize(form.nombre);
    if (!nombre) {
      toast.error("El nombre o razon social es obligatorio");
      return;
    }

    const payload = {
      nombre,
      identificacion: normalize(form.identificacion) || null,
      telefono: normalize(form.telefono) || null,
      correo: normalize(form.correo) || null,
      direccion: normalize(form.direccion) || null,
    };

    try {
      setGuardando(true);
      const res = await crearCliente(payload);
      toast.success("Cliente creado");
      alCreado?.(res?.data);
    } catch (error) {
      toast.error(error?.response?.data?.message || "No se pudo crear el cliente");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="w-full max-w-[760px] flex flex-col">
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-200 flex items-start justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
            <UserRound size={22} strokeWidth={2.3} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              Nuevo cliente
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Se crea y queda seleccionado automáticamente en la venta.
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
          label="Nombre o razon social *"
          value={form.nombre}
          onChange={onChange("nombre")}
          autoFocus
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Identificacion / RUC"
            value={form.identificacion}
            onChange={onChange("identificacion")}
            placeholder="Opcional"
          />
          <Input
            label="Telefono"
            value={form.telefono}
            onChange={onChange("telefono")}
            placeholder="Opcional"
          />
        </div>

        <Input
          label="Correo"
          type="email"
          value={form.correo}
          onChange={onChange("correo")}
          placeholder="Opcional"
        />

        <Input
          label="Direccion"
          value={form.direccion}
          onChange={onChange("direccion")}
          placeholder="Opcional"
        />

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Boton type="button" variante="fantasma" onClick={alCancelar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton tipo="submit" variante="exito" cargando={guardando}>
            Crear cliente
          </Boton>
        </div>
      </form>
    </div>
  );
}
