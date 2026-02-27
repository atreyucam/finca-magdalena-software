import { useMemo, useState, useEffect } from "react";
import { FileText, Save, Edit2, X, Ban, CheckCircle2, Eye } from "lucide-react";
import { TablaFila, TablaCelda } from "../ui/Tabla";
import Boton from "../ui/Boton";
import Input from "../ui/input";
import Select from "../ui/Select";
import Badge from "../ui/Badge";
const METODOS = [
  { value: "Efectivo", label: "Efectivo" },
  { value: "Transferencia", label: "Transferencia" },
  { value: "Cheque", label: "Cheque" },
  { value: "Otro", label: "Otro" },
];

export default function FilaPago({
  detalle,
  esBorrador,
  onSetPendiente,
  onToggleExcluir,
  onAbrirModal,
  onRecibo,
  pendientes = {},
}) {
  const [editando, setEditando] = useState(false);

  const pendiente = pendientes?.[detalle.id];
  const merged = useMemo(() => ({ ...detalle, ...(pendiente || {}) }), [detalle, pendiente]);
  const ajusteMonto = merged.ajustes?.[0]?.monto ?? 0;
  const ajusteMotivo = merged.ajustes?.[0]?.motivo ?? "";

  const [valores, setValores] = useState({
    base: merged.monto_base ?? 0,
    ajuste: merged.ajustes?.[0]?.monto ?? 0,
    motivo: merged.ajustes?.[0]?.motivo ?? "",
    metodo_pago: merged.metodo_pago || "Efectivo",
    metodo_pago_otro: merged.metodo_pago_otro || "",
  });

  useEffect(() => {
    if (!editando) {
      setValores({
        base: merged.monto_base ?? 0,
        ajuste: ajusteMonto,
        motivo: ajusteMotivo,
        metodo_pago: merged.metodo_pago || "Efectivo",
        metodo_pago_otro: merged.metodo_pago_otro || "",
      });
    }
  }, [
    editando,
    merged.monto_base,
    merged.metodo_pago,
    merged.metodo_pago_otro,
    ajusteMonto,
    ajusteMotivo,
  ]);

  const total = Math.max(0, Number(valores.base || 0) + Number(valores.ajuste || 0));
  const diasTexto = Array.isArray(merged.dias) ? merged.dias.join(", ") : "";
  const tienePendiente = !!pendientes?.[detalle.id];

  const guardarLocal = () => {
    if (Number(valores.base) < 0) return alert("El salario base no puede ser negativo");

    const ajustes =
      Number(valores.ajuste || 0) !== 0
        ? [{ monto: Number(valores.ajuste), motivo: String(valores.motivo || "").trim() }]
        : [];

    const patch = {
      monto_base: Number(valores.base || 0),
      ajustes,
      metodo_pago: valores.metodo_pago,
      metodo_pago_otro: valores.metodo_pago === "Otro" ? String(valores.metodo_pago_otro || "").trim() : null,
    };

    onSetPendiente(detalle.id, patch);
    setEditando(false);
  };

  const getBadgeColor = () => {
    const rol = merged.role?.toLowerCase() || "";
    const tipo = merged.tipo?.toLowerCase() || "";
    if (rol.includes("tecnico") || rol.includes("técnico")) return "azul";
    if (tipo === "fijo") return "verde";
    if (tipo === "esporadico" || tipo === "esporádico") return "ambar";
    return "gris";
  };

  const getCargoLabel = () => {
    const rol = merged.role || "Trabajador";
    const tipo = merged.tipo ? ` (${merged.tipo})` : "";
    return `${rol}${tipo}`;
  };

const rowClass = merged.excluido
  ? "!bg-amber-50 hover:!bg-amber-50 text-slate-500"
  : "hover:bg-slate-50";



  return (
    <TablaFila className={rowClass}>
      {/* 1. Trabajador */}
      <TablaCelda>
        <div className={`font-bold ${merged.excluido ? "text-slate-700" : "text-slate-900"}`}>
          {merged.trabajador?.nombre || `${merged.trabajador?.nombres} ${merged.trabajador?.apellidos}`}
        </div>
        <div className="text-xs text-slate-500 font-mono">{merged.trabajador?.cedula}</div>

        <div className="mt-1 flex gap-1">
          {merged.excluido && <Badge color="ambar" size="sm">Excluido</Badge>}
          {tienePendiente && <Badge color="ambar" size="sm">Cambios pendientes</Badge>}
        </div>
      </TablaCelda>

      {/* 2. Cargo */}
      <TablaCelda>
        <Badge color={getBadgeColor()}>{getCargoLabel()}</Badge>
      </TablaCelda>

      {/* 3. Días */}
      <TablaCelda align="right">
        <div className="font-bold text-slate-800">{merged.dias_laborados || 0}</div>
        <div className="text-[10px] text-slate-400 max-w-[100px] truncate" title={diasTexto}>
          {diasTexto || "-"}
        </div>
      </TablaCelda>

      {/* 4. Tareas */}
      <TablaCelda align="right">
        <span className="font-semibold">{merged.tareas_completadas || 0}</span>
      </TablaCelda>

      {/* 5. Salario Base */}
      <TablaCelda align="right" className="min-w-[140px]">
        {editando ? (
          <Input
            type="number"
            min="0"
            step="0.01"
            value={valores.base}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") return setValores((p) => ({ ...p, base: "" }));

              const n = Number(raw);
              if (!Number.isFinite(n)) return;

              setValores((p) => ({ ...p, base: String(Math.max(0, n)) }));
            }}
            className="w-32 text-right py-1 text-sm border-slate-300"
          />
        ) : (
          `$${Number(merged.monto_base || 0).toFixed(2)}`
        )}
      </TablaCelda>

      {/* 6. Ajuste */}
      <TablaCelda align="right" className="min-w-[140px]">
        {editando ? (
          <Input
            type="number"
            step="0.01"
            value={valores.ajuste}
            onChange={(e) => setValores((p) => ({ ...p, ajuste: e.target.value }))}
            className={`w-32 text-right py-1 text-sm ${
              Number(valores.ajuste) < 0 ? "text-rose-600" : "text-emerald-600"
            }`}
          />
        ) : (
          <span
            className={
              Number(merged.ajustes?.[0]?.monto || 0) !== 0
                ? Number(merged.ajustes?.[0]?.monto) > 0
                  ? "text-emerald-600 font-bold"
                  : "text-rose-600 font-bold"
                : "text-slate-400"
            }
          >
            {Number(merged.ajustes?.[0]?.monto || 0) > 0 ? "+" : ""}
            {Number(merged.ajustes?.[0]?.monto || 0).toFixed(2)}
          </span>
        )}
      </TablaCelda>

      {/* 7. Motivo */}
      <TablaCelda>
        {editando ? (
          <Input
            placeholder="Motivo..."
            value={valores.motivo}
            onChange={(e) => setValores((p) => ({ ...p, motivo: e.target.value }))}
            className="w-32 py-1 text-xs"
          />
        ) : (
          <span className="text-xs text-slate-500 italic block w-32 truncate" title={merged.ajustes?.[0]?.motivo}>
            {merged.ajustes?.[0]?.motivo || "—"}
          </span>
        )}
      </TablaCelda>

      {/* 8. Método Pago */}
      <TablaCelda>
        {editando ? (
          <div className="w-32">
            <Select
              value={valores.metodo_pago}
              onChange={(e) => {
                const v = e.target.value; // ✅ CLAVE: tu Select entrega evento
                setValores((prev) => ({
                  ...prev,
                  metodo_pago: v,
                  metodo_pago_otro: v === "Otro" ? prev.metodo_pago_otro : "",
                }));
              }}
              className="py-1 text-xs cursor-pointer"
            >
              {METODOS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>

            {valores.metodo_pago === "Otro" && (
              <Input
                value={valores.metodo_pago_otro}
                onChange={(e) => setValores((p) => ({ ...p, metodo_pago_otro: e.target.value }))}
                placeholder="Especifique"
                className="mt-1 py-0.5 text-xs"
              />
            )}
          </div>
        ) : (
          <div className="text-xs">
            {merged.metodo_pago}
            {merged.metodo_pago === "Otro" && (
              <span className="block text-slate-400 italic">{merged.metodo_pago_otro}</span>
            )}
          </div>
        )}
      </TablaCelda>

      {/* 9. Total */}
      <TablaCelda align="right">
        <span className="font-bold text-slate-900 text-sm">
          ${Number(editando ? total : merged.monto_total || 0).toFixed(2)}
        </span>
      </TablaCelda>

      {/* 10. Acciones */}
      <TablaCelda align="right">
        <div className="flex justify-end gap-2">
          {esBorrador ? (
            <>
              {editando ? (
                <>
                  <Boton
                    variante="fantasma"
                    className="!p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                    onClick={() => setEditando(false)}
                    title="Cancelar"
                  >
                    <X size={16} />
                  </Boton>

                  <Boton
                    variante="primario"
                    className="!p-1.5 cursor-pointer"
                    onClick={guardarLocal}
                    title="Guardar cambios fila"
                  >
                    <Save size={16} />
                  </Boton>
                </>
              ) : (
                <Boton
                  variante="fantasma"
                  className="!p-1.5 text-slate-500 hover:text-blue-600 cursor-pointer"
                  onClick={() => setEditando(true)}
                  title="Editar fila"
                >
                  <Edit2 size={16} />
                </Boton>
              )}

              {/* Toggle excluir/incluir */}
<Boton
  variante="fantasma" // 👈 mejor usar fantasma y controlar TODO con className
  className={
    merged.excluido
      ? [
          "!p-1.5",
          "bg-emerald-100 text-emerald-800 border border-emerald-200",
          "hover:bg-emerald-200 hover:border-emerald-300 hover:text-emerald-900",
          "hover:opacity-100 hover:brightness-100", // 👈 evita fade
          "cursor-pointer",
        ].join(" ")
      : [
          "!p-1.5",
          "bg-amber-100 text-amber-800 border border-amber-200",
          "hover:bg-amber-200 hover:border-amber-300 hover:text-amber-900",
          "hover:opacity-100 hover:brightness-100", // 👈 evita fade
          "cursor-pointer",
        ].join(" ")
  }
  onClick={() => onToggleExcluir(detalle.id, !merged.excluido)}
  title={merged.excluido ? "Incluir Trabajador" : "Excluir Trabajador"}
>
  {merged.excluido ? <CheckCircle2 size={16} /> : <Ban size={16} />}
</Boton>


              <Boton
                variante="fantasma"
                className="!p-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer"
                onClick={() => onAbrirModal(detalle.id)}
                title="Ver Detalle"
              >
                <Eye size={16} />
              </Boton>
            </>
          ) : (
            <>
              <Boton
                variante="fantasma"
                className="!p-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer"
                onClick={() => onAbrirModal(detalle.id)}
                title="Ver Detalle"
              >
                <Eye size={16} />
              </Boton>

              <Boton
  variante="fantasma"
  className="!p-1.5 text-emerald-600 hover:bg-emerald-50 cursor-pointer"
  onClick={() => onRecibo(detalle.id)}
  title="Descargar Recibo"
>
  <FileText size={16} />
</Boton>

            </>
          )}
        </div>
      </TablaCelda>
    </TablaFila>
  );
}
