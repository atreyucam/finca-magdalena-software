import { useEffect, useMemo, useState } from "react";
import Input from "../ui/Input";
import Boton from "../ui/Boton";
import useToast from "../../hooks/useToast";
import { liquidarVenta } from "../../api/apiClient";

const CLASES_POR_TIPO = {
  EXPORTACION: [
    { value: "grande", label: "Grande" },
    { value: "pequena", label: "Pequeña" },
  ],
  NACIONAL: [
    { value: "primera", label: "Primera" },
    { value: "segunda", label: "Segunda" },
    { value: "tercera", label: "Tercera" },
    { value: "cuarta", label: "Cuarta" },
    { value: "quinta", label: "Quinta" },
  ],
};

function toNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function round2(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function money(value) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function buildInitialDetalle(clases, venta) {
  const detalleActual = Array.isArray(venta?.detalles) ? venta.detalles : [];
  const mapActual = new Map(
    detalleActual.map((d) => [String(d.clase || "").toLowerCase(), d])
  );

  const out = {};
  for (const c of clases) {
    const existing = mapActual.get(c.value);
    out[c.value] = {
      clase: c.value,
      peso_kg: existing ? String(existing.peso_kg ?? "") : "",
      precio_unitario: existing ? String(existing.precio_unitario ?? "") : "",
    };
  }
  return out;
}

export default function ModalLiquidacionVenta({ abierto, venta, onGuardado, onCancelar }) {
  const toast = useToast();
  const [guardando, setGuardando] = useState(false);
  const clases = CLASES_POR_TIPO[String(venta?.tipo_venta || "").toUpperCase()] || [];

  const [numeroRecibo, setNumeroRecibo] = useState("");
  const [gavetasDevueltas, setGavetasDevueltas] = useState("0");
  const [gavetasUtiles, setGavetasUtiles] = useState("0");
  const [detalle, setDetalle] = useState(() => buildInitialDetalle(clases, venta));

  useEffect(() => {
    if (!abierto) return;
    setNumeroRecibo(venta?.numero_recibo || "");
    setGavetasDevueltas(
      venta?.gavetas_devueltas === null || venta?.gavetas_devueltas === undefined
        ? "0"
        : String(venta.gavetas_devueltas)
    );
    setGavetasUtiles(
      venta?.gavetas_utiles === null || venta?.gavetas_utiles === undefined
        ? String(venta?.gavetas_entregadas || 0)
        : String(venta.gavetas_utiles)
    );
    setDetalle(buildInitialDetalle(clases, venta));
  }, [abierto, venta, venta?.id, venta?.tipo_venta]);

  const filas = useMemo(() => {
    return clases.map((c) => {
      const row = detalle[c.value] || { peso_kg: "", precio_unitario: "" };
      const subtotal = round2(toNumber(row.peso_kg) * toNumber(row.precio_unitario));
      return {
        ...c,
        peso_kg: row.peso_kg,
        precio_unitario: row.precio_unitario,
        subtotal,
      };
    });
  }, [clases, detalle]);

  const total = useMemo(
    () => round2(filas.reduce((acc, row) => acc + Number(row.subtotal || 0), 0)),
    [filas]
  );

  const onChangeDetalle = (clase, field) => (e) => {
    const value = e.target.value;
    setDetalle((prev) => ({
      ...prev,
      [clase]: {
        ...(prev[clase] || { clase, peso_kg: "", precio_unitario: "" }),
        [field]: value,
      },
    }));
  };

  const submit = async (e) => {
    e.preventDefault();

    const detallesPayload = filas
      .map((row) => ({
        clase: row.value,
        peso_kg: toNumber(row.peso_kg),
        precio_unitario: toNumber(row.precio_unitario),
      }))
      .filter((row) => row.peso_kg > 0 && row.precio_unitario > 0);

    if (!String(numeroRecibo || "").trim()) {
      toast.error("El número de recibo es obligatorio");
      return;
    }

    if (detallesPayload.length === 0) {
      toast.error("Debes ingresar al menos una clase con peso y precio válidos");
      return;
    }

    const payload = {
      numero_recibo: String(numeroRecibo).trim(),
      detalles: detallesPayload,
      gavetas_devueltas: toNumber(gavetasDevueltas),
      gavetas_utiles: toNumber(gavetasUtiles),
    };

    try {
      setGuardando(true);
      const res = await liquidarVenta(venta.id, payload);
      toast.success("Liquidación registrada");
      onGuardado?.(res?.data);
    } catch (error) {
      toast.error(error?.response?.data?.message || "No se pudo registrar la liquidación");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 px-4 sm:px-6 lg:px-8 py-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="Número de recibo *"
          value={numeroRecibo}
          onChange={(e) => setNumeroRecibo(e.target.value)}
          required
        />
        <Input
          label="Gavetas devueltas"
          type="number"
          min="0"
          step="1"
          value={gavetasDevueltas}
          onChange={(e) => setGavetasDevueltas(e.target.value)}
        />
        <Input
          label="Gavetas útiles"
          type="number"
          min="0"
          step="1"
          value={gavetasUtiles}
          onChange={(e) => setGavetasUtiles(e.target.value)}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-4 bg-slate-50 px-4 py-2 text-xs uppercase tracking-wide font-bold text-slate-500">
          <div>Clase</div>
          <div>Peso (kg)</div>
          <div>Precio unitario</div>
          <div className="text-right">Subtotal</div>
        </div>

        <div className="divide-y divide-slate-100">
          {filas.map((row) => (
            <div key={row.value} className="grid grid-cols-4 items-center gap-3 px-4 py-3">
              <div className="text-sm font-semibold text-slate-800">{row.label}</div>
              <Input
                type="number"
                min="0"
                step="0.001"
                value={row.peso_kg}
                onChange={onChangeDetalle(row.value, "peso_kg")}
                placeholder="0"
              />
              <Input
                type="number"
                min="0"
                step="0.0001"
                value={row.precio_unitario}
                onChange={onChangeDetalle(row.value, "precio_unitario")}
                placeholder="0"
              />
              <div className="text-right text-sm font-semibold text-slate-700">{money(row.subtotal)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-xs uppercase tracking-wide font-bold text-emerald-700">Total calculado</p>
        <p className="text-2xl font-black text-emerald-800">{money(total)}</p>
        <p className="text-xs text-emerald-700 mt-1">El backend recalcula subtotales y total final.</p>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
        <Boton type="button" variante="fantasma" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Boton>
        <Boton tipo="submit" variante="exito" cargando={guardando}>
          Guardar liquidación
        </Boton>
      </div>
    </form>
  );
}
