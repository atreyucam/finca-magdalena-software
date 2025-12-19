import { useMemo, useState, useEffect } from "react";
import { FileText, Save, Edit2, X, Ban, CheckCircle2, Eye, AlertCircle } from "lucide-react";
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
  
  // Combina datos del backend con cambios locales pendientes
  const pendiente = pendientes?.[detalle.id] || {};
  const merged = useMemo(() => ({ ...detalle, ...pendiente }), [detalle, pendiente]);
  
  const [valores, setValores] = useState({
    base: merged.monto_base ?? 0,
    ajuste: merged.ajustes?.[0]?.monto ?? 0,
    motivo: merged.ajustes?.[0]?.motivo ?? "",
    metodo_pago: merged.metodo_pago || "Efectivo",
    metodo_pago_otro: merged.metodo_pago_otro || "",
  });

  // === CORRECCIÓN DEL BUCLE INFINITO ===
  // En lugar de depender de [merged], dependemos de sus valores individuales.
  useEffect(() => {
    if (!editando) {
        setValores({
          base: merged.monto_base ?? 0,
          ajuste: merged.ajustes?.[0]?.monto ?? 0,
          motivo: merged.ajustes?.[0]?.motivo ?? "",
          metodo_pago: merged.metodo_pago || "Efectivo",
          metodo_pago_otro: merged.metodo_pago_otro || "",
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editando, 
    // Dependencias primitivas (rompen el bucle de objetos)
    merged.monto_base, 
    merged.metodo_pago, 
    merged.metodo_pago_otro,
    // Accedemos a los valores internos del array/objeto para evitar referencias cambiantes
    merged.ajustes?.[0]?.monto,
    merged.ajustes?.[0]?.motivo,
    detalle.id // Por si React recicla el componente
  ]); 

  const total = Math.max(0, Number(valores.base || 0) + Number(valores.ajuste || 0));
  const diasTexto = Array.isArray(merged.dias) ? merged.dias.join(", ") : "";
  const tienePendiente = !!pendientes?.[detalle.id];

  const guardarLocal = () => {
    // Validacion Basica
    if (Number(valores.base) < 0) return alert("El salario base no puede ser negativo");

    const ajustes = Number(valores.ajuste || 0) !== 0
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

  // Logica de Colores para el Cargo
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

  return (
    <TablaFila className={merged.excluido ? "opacity-50 bg-slate-50" : ""}>
      {/* 1. Trabajador */}
      <TablaCelda>
        <div className="font-bold text-slate-900">
          {merged.trabajador?.nombre || `${merged.trabajador?.nombres} ${merged.trabajador?.apellidos}`}
        </div>
        <div className="text-xs text-slate-500 font-mono">{merged.trabajador?.cedula}</div>
        <div className="mt-1 flex gap-1">
             {merged.excluido && <Badge color="rojo" size="sm">Excluido</Badge>}
             {tienePendiente && <Badge color="ambar" size="sm">Cambios pendientes</Badge>}
        </div>
      </TablaCelda>

      {/* 2. Cargo (Color coded) */}
      <TablaCelda>
        <Badge color={getBadgeColor()}>{getCargoLabel()}</Badge>
      </TablaCelda>

      {/* 3. Días */}
      <TablaCelda align="right">
        <div className="font-bold text-slate-800">{merged.dias_laborados || 0}</div>
        <div className="text-[10px] text-slate-400 max-w-[100px] truncate" title={diasTexto}>{diasTexto || "-"}</div>
      </TablaCelda>

      {/* 4. Tareas */}
      <TablaCelda align="right">
          <span className="font-semibold">{merged.tareas_completadas || 0}</span>
      </TablaCelda>

      {/* 5. Salario Base (Input) */}
      <TablaCelda align="right">
        {editando ? (
          <Input
            type="number"
            min="0"
            step="0.01"
            value={valores.base}
            onChange={(e) => {
                if(Number(e.target.value) >= 0) setValores({ ...valores, base: e.target.value })
            }}
            className="w-24 text-right py-1 text-sm border-slate-300"
          />
        ) : (
          `$${Number(merged.monto_base || 0).toFixed(2)}`
        )}
      </TablaCelda>

      {/* 6. Ajuste (Input) */}
      <TablaCelda align="right">
        {editando ? (
          <Input
            type="number"
            step="0.01"
            value={valores.ajuste}
            onChange={(e) => setValores({ ...valores, ajuste: e.target.value })}
            className={`w-20 text-right py-1 text-sm ${Number(valores.ajuste) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}
          />
        ) : (
          <span className={Number(merged.ajustes?.[0]?.monto || 0) !== 0 ? (Number(merged.ajustes?.[0]?.monto) > 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold") : "text-slate-400"}>
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
            onChange={(e) => setValores({ ...valores, motivo: e.target.value })}
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
                onChange={(v) => setValores({ ...valores, metodo_pago: v, metodo_pago_otro: v === "Otro" ? valores.metodo_pago_otro : "" })}
                opciones={METODOS}
                className="py-1 text-xs"
              />
              {valores.metodo_pago === "Otro" && (
                  <Input 
                    value={valores.metodo_pago_otro} 
                    onChange={e => setValores({...valores, metodo_pago_otro: e.target.value})}
                    placeholder="Especifique"
                    className="mt-1 py-0.5 text-xs"
                  />
              )}
            </div>
        ) : (
            <div className="text-xs">
                 {merged.metodo_pago}
                 {merged.metodo_pago === 'Otro' && <span className="block text-slate-400 italic">{merged.metodo_pago_otro}</span>}
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
        <div className="flex justify-end gap-1">
          {esBorrador ? (
            <>
              {editando ? (
                <>
                  <Boton variante="fantasma" className="!p-1.5 text-rose-500" onClick={() => setEditando(false)} title="Cancelar">
                    <X size={16} />
                  </Boton>
                  <Boton variante="primario" className="!p-1.5" onClick={guardarLocal} title="Guardar cambios fila">
                    <Save size={16} />
                  </Boton>
                </>
              ) : (
                <Boton variante="fantasma" className="!p-1.5 text-slate-400 hover:text-blue-600" onClick={() => setEditando(true)} title="Editar fila">
                  <Edit2 size={16} />
                </Boton>
              )}

              <Boton 
                variante="fantasma" 
                className={`!p-1.5 ${merged.excluido ? 'text-emerald-600' : 'text-rose-500'}`} 
                onClick={() => onToggleExcluir(detalle.id, !merged.excluido)}
                title={merged.excluido ? "Incluir Trabajador" : "Excluir Trabajador"}
              >
                  {merged.excluido ? <CheckCircle2 size={16} /> : <Ban size={16} />}
              </Boton>

              <Boton variante="neutro" className="!p-1.5 text-slate-600" onClick={() => onAbrirModal(detalle.id)} title="Ver Detalle">
                <Eye size={16} />
              </Boton>
            </>
          ) : (
            // Si está APROBADO
            <>
                <Boton variante="fantasma" className="!p-1.5 text-slate-600" onClick={() => onAbrirModal(detalle.id)} title="Ver Detalle">
                    <Eye size={16} />
                </Boton>
                
                {/* Botón Descargar Recibo solo si NO es borrador */}
                <Boton variante="fantasma" className="!p-1.5 text-emerald-600" onClick={() => onRecibo(detalle.id)} title="Descargar Recibo">
                    <FileText size={16} />
                </Boton>
            </>
          )}
        </div>
      </TablaCelda>
    </TablaFila>
  );
}