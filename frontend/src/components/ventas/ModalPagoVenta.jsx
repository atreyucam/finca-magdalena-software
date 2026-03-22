import { useEffect, useState } from "react";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Boton from "../ui/Boton";
import useToast from "../../hooks/useToast";
import { pagarVenta } from "../../api/apiClient";

const FORMAS_PAGO = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTRO", label: "Otro" },
];

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

export default function ModalPagoVenta({ abierto, venta, onGuardado, onCancelar }) {
  const toast = useToast();
  const [guardando, setGuardando] = useState(false);
  const [formaPago, setFormaPago] = useState("EFECTIVO");
  const [fechaPago, setFechaPago] = useState(todayYmd());
  const [observacion, setObservacion] = useState("");

  useEffect(() => {
    if (!abierto) return;
    setFormaPago(venta?.forma_pago || "EFECTIVO");
    setFechaPago(venta?.fecha_pago || todayYmd());
    setObservacion(venta?.observacion_pago || "");
  }, [abierto, venta, venta?.id]);

  const submit = async (e) => {
    e.preventDefault();

    if (!formaPago) {
      toast.error("Selecciona una forma de pago");
      return;
    }

    const payload = {
      forma_pago: formaPago,
      fecha_pago: String(fechaPago || "").trim() || null,
      observacion: String(observacion || "").trim() || null,
    };

    try {
      setGuardando(true);
      const res = await pagarVenta(venta.id, payload);
      toast.success("Pago registrado");
      onGuardado?.(res?.data);
    } catch (error) {
      toast.error(error?.response?.data?.message || "No se pudo registrar el pago");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 px-4 sm:px-6 lg:px-8 py-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select label="Forma de pago *" value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
          {FORMAS_PAGO.map((fp) => (
            <option key={fp.value} value={fp.value}>
              {fp.label}
            </option>
          ))}
        </Select>

        <Input
          label="Fecha de pago"
          type="date"
          value={fechaPago}
          onChange={(e) => setFechaPago(e.target.value)}
        />
      </div>

      <Input
        label="Observación"
        value={observacion}
        onChange={(e) => setObservacion(e.target.value)}
        placeholder="Opcional"
      />

      <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
        <Boton type="button" variante="fantasma" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Boton>
        <Boton tipo="submit" variante="primario" cargando={guardando}>
          Guardar pago
        </Boton>
      </div>
    </form>
  );
}
