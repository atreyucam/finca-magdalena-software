import { useEffect, useState } from "react";
import { Trash2, UserRound, UserX, X } from "lucide-react";
import Input from "../ui/Input";
import Boton from "../ui/Boton";
import useToast from "../../hooks/useToast";
import VentanaModal from "../ui/VentanaModal";
import { crearCliente, desactivarCliente, editarCliente, eliminarCliente } from "../../api/apiClient";

function normalize(value) {
  return String(value ?? "").trim();
}

export default function FormularioClienteRapido({ alCancelar, alCreado, cliente = null, modo = "crear" }) {
  const toast = useToast();
  const [guardando, setGuardando] = useState(false);
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    identificacion: "",
    telefono: "",
    correo: "",
    direccion: "",
  });

  const esEdicion = modo === "editar" && cliente?.id;
  const puedeEliminar = esEdicion && cliente?.puede_eliminar;
  const puedeDesactivar = esEdicion && cliente?.puede_desactivar;
  const accionDestructiva = puedeEliminar ? "eliminar" : puedeDesactivar ? "desactivar" : null;

  useEffect(() => {
    setForm({
      nombre: cliente?.nombre || "",
      identificacion: cliente?.identificacion || "",
      telefono: cliente?.telefono || "",
      correo: cliente?.correo || "",
      direccion: cliente?.direccion || "",
    });
  }, [cliente]);

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
      const res = esEdicion
        ? await editarCliente(cliente.id, payload)
        : await crearCliente(payload);
      toast.success(esEdicion ? "Cliente actualizado" : "Cliente creado");
      alCreado?.(res?.data);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          (esEdicion ? "No se pudo actualizar el cliente" : "No se pudo crear el cliente")
      );
    } finally {
      setGuardando(false);
    }
  };

  const ejecutarAccionDestructiva = async () => {
    if (!esEdicion || !accionDestructiva) return;

    try {
      setProcesandoAccion(true);
      if (accionDestructiva === "eliminar") {
        await eliminarCliente(cliente.id);
        toast.success("Cliente eliminado");
      } else {
        await desactivarCliente(cliente.id);
        toast.success("Cliente desactivado");
      }
      setConfirmOpen(false);
      alCreado?.(null);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          (accionDestructiva === "eliminar"
            ? "No se pudo eliminar el cliente"
            : "No se pudo desactivar el cliente")
      );
    } finally {
      setProcesandoAccion(false);
    }
  };

  return (
    <>
      <div className="w-full flex flex-col">
        <div className="border-b border-slate-200 bg-slate-50/50 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex w-full items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <UserRound size={22} strokeWidth={2.3} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                  {esEdicion ? "Editar cliente" : "Nuevo cliente"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  {esEdicion
                    ? "Actualiza la información comercial del cliente."
                    : "Se crea y queda seleccionado automáticamente en la venta."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={alCancelar}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
              aria-label="Cerrar"
              title="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={submit} className="w-full space-y-4 px-4 py-5 sm:px-6 lg:px-8">
          <Input
            label="Nombre o razon social *"
            value={form.nombre}
            onChange={onChange("nombre")}
            autoFocus
            required
          />

          <Input
            label="Identificacion / RUC"
            value={form.identificacion}
            onChange={onChange("identificacion")}
            placeholder="Opcional"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Telefono"
              value={form.telefono}
              onChange={onChange("telefono")}
              placeholder="Opcional"
            />
            <Input
              label="Correo"
              type="email"
              value={form.correo}
              onChange={onChange("correo")}
              placeholder="Opcional"
            />
          </div>

          <Input
            label="Direccion"
            value={form.direccion}
            onChange={onChange("direccion")}
            placeholder="Opcional"
          />

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {accionDestructiva ? (
                <Boton
                  type="button"
                  variante="outlinePeligro"
                  onClick={() => setConfirmOpen(true)}
                  disabled={guardando || procesandoAccion}
                >
                  {accionDestructiva === "eliminar" ? (
                    <Trash2 className="mr-2 h-4 w-4" />
                  ) : (
                    <UserX className="mr-2 h-4 w-4" />
                  )}
                  {accionDestructiva === "eliminar" ? "Eliminar cliente" : "Desactivar cliente"}
                </Boton>
              ) : null}
            </div>

            <div className="flex justify-end gap-3">
              <Boton type="button" variante="fantasma" onClick={alCancelar} disabled={guardando || procesandoAccion}>
                Cancelar
              </Boton>
              <Boton tipo="submit" variante="primario" cargando={guardando}>
                {esEdicion ? "Guardar cambios" : "Crear cliente"}
              </Boton>
            </div>
          </div>
        </form>
      </div>

      <VentanaModal
        abierto={confirmOpen}
        cerrar={() => (procesandoAccion ? null : setConfirmOpen(false))}
        titulo={accionDestructiva === "eliminar" ? "Eliminar cliente" : "Desactivar cliente"}
        descripcion={
          accionDestructiva === "eliminar"
            ? "Esta acción eliminará el cliente de forma permanente porque no tiene facturas registradas."
            : "Este cliente tiene facturas registradas y quedará inactivo para nuevos usos."
        }
        maxWidthClass="sm:max-w-[min(520px,calc(100vw-1rem))]"
      >
        <div className="space-y-5 px-4 py-5 sm:px-6">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {accionDestructiva === "eliminar"
              ? "¿Seguro que quieres eliminar este cliente?"
              : "¿Seguro que quieres desactivar este cliente?"}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
            <Boton
              type="button"
              variante="fantasma"
              onClick={() => setConfirmOpen(false)}
              disabled={procesandoAccion}
            >
              Cancelar
            </Boton>
            <Boton
              type="button"
              variante="outlinePeligro"
              onClick={ejecutarAccionDestructiva}
              cargando={procesandoAccion}
            >
              {accionDestructiva === "eliminar" ? "Sí, eliminar" : "Sí, desactivar"}
            </Boton>
          </div>
        </div>
      </VentanaModal>
    </>
  );
}
