import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  ShieldCheck, CloudSun, Leaf, Scale, AlertTriangle, CheckCircle2, 
  AlertCircle, Clock, XCircle, Droplets, Sun, Beaker, Tractor,
  Layers, Truck, DollarSign, Edit2, Save, Trash2, Plus, Lock, Scissors
} from "lucide-react";
import { actualizarDetalles } from "../../api/apiClient"; 
import Input from "../ui/Input";
import { Tabla, TablaCabecera, TablaHead, TablaCuerpo, TablaFila, TablaCelda } from "../ui/Tabla";

// --- Helpers de Formato ---
const fmtPct = (v) => (v != null ? `${Number(v).toFixed(1)} %` : "—");
const fmtKg = (v) => (v != null ? `${Number(v).toFixed(2)} kg` : "—");
const fmtUSD = (v) => (v != null ? `$${Number(v).toFixed(2)}` : "$0.00");

// --- COMPONENTES UI GENÉRICOS ---

const SectionHeader = ({ icon, title, onEdit, isEditing, loading, canEdit, disabledMessage }) => (
    (() => {
      const iconNode = icon ? React.createElement(icon, { size: 16, className: "text-emerald-600" }) : null;
      return (
    <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 mt-8">
        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wide">
            {iconNode} {title}
        </h4>
        {canEdit ? (
             <button 
                onClick={onEdit} 
                disabled={loading}
                className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all font-bold
                    ${isEditing 
                        ? "bg-emerald-600 text-white shadow-md hover:bg-emerald-700" 
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
            >
                {loading ? "Guardando..." : isEditing ? <><Save size={14}/> Guardar</> : <><Edit2 size={14}/> Editar</>}
            </button>
        ) : (
             disabledMessage && <span className="text-[10px] text-slate-400 italic flex items-center gap-1"><Lock size={10}/> {disabledMessage}</span>
        )}
    </div>
      );
    })()
);

const DetailRow = ({ label, value, subValue, icon }) => {
  const iconNode = icon ? React.createElement(icon, { size: 14, className: "text-slate-400" }) : null;
  return (
  <div className="flex justify-between py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors px-2 rounded-lg">
    <div className="flex items-center gap-2">
        {iconNode}
        <span className="text-slate-500 text-sm font-medium">{label}</span>
    </div>
    <div className="text-right">
      <span className="font-semibold text-slate-800 text-sm block capitalize">{value}</span>
      {subValue && <span className="text-xs text-slate-400 block mt-0.5">{subValue}</span>}
    </div>
  </div>
  );
};

const PlanRealCards = ({ plan, real, unit = "kg", realLabel = "Real" }) => {
  const planNum = Number(plan) || 0;
  const realNum = Number(real) || 0;
  const cumplimiento = planNum > 0 ? (realNum / planNum) * 100 : 0;
  
  const isLow = planNum > 0 && realNum < planNum;
  const cardBg = isLow ? "bg-rose-50 border-rose-100" : "bg-emerald-50 border-emerald-100";
  const titleColor = isLow ? "text-rose-600" : "text-emerald-600";
  const valueColor = isLow ? "text-rose-800" : "text-emerald-800";
  const badgeBg = isLow ? "bg-rose-200 text-rose-900" : "bg-emerald-200 text-emerald-800";
  const Icon = isLow ? AlertCircle : CheckCircle2;

  const format = (val) => {
    if (val == null) return "—";
    if (unit === "kg") return fmtKg(val);
    if (unit === "%") return fmtPct(val);
    return `${Number(val).toFixed(0)}`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5">
      <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 shadow-xs text-center flex flex-col justify-center">
        <span className="text-xs uppercase text-blue-600 font-bold tracking-wider block mb-1">Planificado</span>
        <span className="font-bold text-xl text-blue-900">{format(plan)} <span className="text-xs font-normal text-blue-600/70">{unit !== "%" && unit !== "kg" ? unit : ""}</span></span>
      </div>

      <div className={`${cardBg} p-4 rounded-2xl border text-center relative overflow-hidden shadow-xs flex flex-col justify-center transition-colors duration-300`}>
        <span className={`text-xs uppercase ${titleColor} font-bold tracking-wider block mb-1 flex items-center justify-center gap-1`}>
          {realLabel} <Icon size={12} />
        </span>
        <span className={`font-bold text-xl ${valueColor}`}>{format(real)} <span className="text-xs font-normal opacity-70">{unit !== "%" && unit !== "kg" ? unit : ""}</span></span>
        {planNum > 0 && (
            <div className={`absolute top-0 right-0 ${badgeBg} text-xs px-3 py-1.5 rounded-bl-2xl font-black shadow-sm`}>
               {cumplimiento.toFixed(0)}%
            </div>
        )}
      </div>
    </div>
  );
};

const BPACards = ({ clima, epp, reingreso, isWorker }) => (
    <div className="mt-6 pt-4 border-t border-dashed border-slate-200">
        <div className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wide flex items-center gap-2"><Leaf size={14}/> Buenas Prácticas Agrícolas</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100 flex flex-col gap-1 shadow-sm">
                <div className="flex items-center gap-2 text-sky-600 text-xs font-bold uppercase tracking-wider"><CloudSun size={16} /> Clima</div>
                <div className="font-bold text-slate-700 text-lg capitalize">{clima || "—"}</div>
            </div>
            {!isWorker && (
                <div className={`p-4 rounded-xl border flex flex-col gap-1 shadow-sm ${epp ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50/50 border-rose-100"}`}>
                    <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${epp ? "text-emerald-600" : "text-rose-600"}`}><ShieldCheck size={16} /> EPP</div>
                    <div className={`font-bold text-lg flex items-center gap-2 ${epp ? "text-emerald-700" : "text-rose-700"}`}>{epp ? <>Verificado <CheckCircle2 size={16}/></> : <>Pendiente <XCircle size={16}/></>}</div>
                </div>
            )}
            <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 flex flex-col gap-1 shadow-sm">
                <div className="flex items-center gap-2 text-amber-600 text-xs font-bold uppercase tracking-wider"><AlertTriangle size={16} /> Reingreso</div>
                <div className="font-bold text-amber-800 text-lg flex items-baseline gap-1">{reingreso != null ? reingreso : "—"} <span className="text-sm font-medium text-amber-600">horas</span></div>
            </div>
        </div>
    </div>
);

// --- COMPONENTES DE OTRAS TAREAS ---
const DetailsPoda = ({ data }) => (<><div className="mb-4 flex items-center justify-between"><div><span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Tipo de Poda</span><div className="text-lg font-bold text-slate-800 capitalize">{data.tipo}</div></div></div><PlanRealCards plan={data.porcentaje_plantas_plan_pct} real={data.porcentaje_plantas_real_pct} unit="%" realLabel="Avance Real" /><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4"><div className={`p-4 rounded-xl border shadow-sm flex flex-col justify-center items-center text-center h-full min-h-[100px] ${data.herramientas_desinfectadas ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}><div className={`text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center justify-center gap-1 ${data.herramientas_desinfectadas ? "text-emerald-700" : "text-rose-700"}`}><ShieldCheck size={14}/> Herramientas</div><div className={`font-bold text-base flex items-center justify-center gap-2 ${data.herramientas_desinfectadas ? "text-emerald-800" : "text-rose-800"}`}>{data.herramientas_desinfectadas ? <>Desinfectadas <CheckCircle2 size={18}/></> : <>Pendiente <XCircle size={18}/></>}</div></div><div className="bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm flex flex-col justify-center items-center text-center h-full min-h-[100px]"><div className="text-[10px] uppercase font-bold text-amber-700 tracking-wider mb-1 flex items-center justify-center gap-1"><Leaf size={14}/> Restos</div><div className="font-bold text-base text-amber-900 capitalize">{data.disposicion_restos || "No registrado"}</div></div></div></>);
const DetailsMaleza = ({ data }) => (
  <>
    {/* Card Full Width para Método */}
    <div className="mb-4">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Método de Control</span>
        <div className="text-lg font-bold text-slate-800 capitalize">{data.metodo || "—"}</div>
    </div>

    <PlanRealCards plan={data.cobertura_planificada_pct} real={data.cobertura_real_pct} unit="%" realLabel="Cobertura" />
    
    {/* Card para Altura de Corte */}
    <div className="mt-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Scissors size={14}/> Altura de Corte
            </span>
            <div className="text-xl font-bold text-slate-800">
                {data.altura_corte_cm ? `${data.altura_corte_cm} cm` : "—"}
            </div>
        </div>
    </div>
  </>
);

const DetailsEnfundado = ({ data }) => (<PlanRealCards plan={data.porcentaje_frutos_plan_pct} real={data.porcentaje_frutos_real_pct} unit="%" realLabel="Frutos enfundados" />);
const DetailsNutricion = ({ data, isWorker }) => (
  <>
    {/* Card Full Width para Método */}
    <div className="mb-4">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Método de Aplicación</span>
        <div className="text-lg font-bold text-slate-800 capitalize">{data.metodo_aplicacion || "—"}</div>
    </div>

    <PlanRealCards plan={data.porcentaje_plantas_plan_pct} real={data.porcentaje_plantas_real_pct} unit="%" realLabel="Ejecutado" />
    <BPACards clima={data.clima_inicio} epp={data.epp_verificado} reingreso={data.periodo_reingreso_horas} isWorker={isWorker} />
  </>
);

const DetailsFitosanitario = ({ data, isWorker }) => (<><div className="mb-5 p-4 bg-sky-50/60 rounded-xl border border-sky-100 flex items-start gap-3"><div className="bg-sky-100 p-2 rounded-lg text-sky-600"><Leaf size={20} /></div><div><div className="text-[10px] font-bold text-sky-700 uppercase tracking-wider mb-0.5">Plaga</div><div className="text-sm font-bold text-slate-800 capitalize">{data.plaga_enfermedad || "—"}</div></div></div><PlanRealCards plan={data.porcentaje_plantas_plan_pct} real={data.porcentaje_plantas_real_pct} unit="%" realLabel="Ejecutado" /><div className="space-y-1 mb-6"><DetailRow label="Equipo" value={data.equipo_aplicacion || "—"} icon={Tractor} /><DetailRow label="Volumen" value={data.volumen_aplicacion_lt ? `${data.volumen_aplicacion_lt} L` : "—"} icon={Beaker} /><DetailRow label="Carencia" value={`${data.periodo_carencia_dias || 0} días`} icon={Clock} /></div><BPACards clima={data.clima_inicio} epp={data.epp_verificado} reingreso={data.periodo_reingreso_horas} isWorker={isWorker} /></>);


// =================================================================================================
// 🌟 SECCIÓN COSECHA AVANZADA (NUEVA LÓGICA)
// =================================================================================================

const ClassificationManager = ({ clasificacion = [], rechazos = [], kgBascula = 0, tareaId, canEdit, onRefresh }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localClasif, setLocalClasif] = useState(clasificacion);
    const [localRechazos, setLocalRechazos] = useState(rechazos);
    const [loading, setLoading] = useState(false);

    // Sincronizar props
    useEffect(() => { 
        if(!isEditing) {
            setLocalClasif(clasificacion);
            setLocalRechazos(rechazos);
        }
    }, [clasificacion, rechazos, isEditing]);

    const DESTINOS = [
        { value: "Exportacion", label: "Exportación" },
        { value: "Nacional", label: "Nacional" },
    ];

    const CAUSAS = [
        { value: "DanoMecanico", label: "Daño mecánico" },
        { value: "Plaga", label: "Plaga / enfermedad" },
        { value: "Calibre", label: "Calibre fuera de estándar" },
        { value: "Manipulacion", label: "Mala manipulación" },
        { value: "Otro", label: "Otro" },
    ];

    const totalClasif = localClasif.reduce((acc, r) => acc + (Number(r.kg)||0), 0);
    const totalRechazo = localRechazos.reduce((acc, r) => acc + (Number(r.kg)||0), 0);
    const totalProcesado = totalClasif + totalRechazo;
    const restante = (Number(kgBascula)||0) - totalProcesado;
    const isBalanced = Math.abs(restante) < 0.05; 
    const isMissing = restante > 0.05;  
    const isExcess = restante < -0.05;  

    const handleSave = async () => {
        if (!isBalanced) {
            if (isMissing) toast.warning(`Faltan clasificar ${restante.toFixed(2)} kg.`);
            if (isExcess) toast.error(`Te has excedido por ${Math.abs(restante).toFixed(2)} kg.`);
        }
        setLoading(true);
        try {
            await actualizarDetalles(tareaId, { 
                clasificacion: localClasif,
                rechazos: localRechazos
            });
            // ✅ FIX: Esperar refresh
            if (onRefresh) await onRefresh();
            setIsEditing(false);
            toast.success("Clasificación guardada");
        } catch {
            toast.error("Error al guardar clasificación");
        } finally {
            setLoading(false);
        }
    };

    const updateClasif = (idx, field, val) => {
        const copy = [...localClasif];
        copy[idx][field] = val;
        setLocalClasif(copy);
    };
    const addClasif = () => setLocalClasif([...localClasif, { destino: "", gabetas: "", peso_promedio_gabeta_kg: "", kg: "" }]);
    const removeClasif = (idx) => setLocalClasif(localClasif.filter((_, i) => i !== idx));

    const updateRechazo = (idx, field, val) => {
        const copy = [...localRechazos];
        copy[idx][field] = val;
        setLocalRechazos(copy);
    };
    const addRechazo = () => setLocalRechazos([...localRechazos, { causa: "", kg: "", observacion: "" }]);
    const removeRechazo = (idx) => setLocalRechazos(localRechazos.filter((_, i) => i !== idx));

    const BalanceHeader = () => {
        let bgClass = "bg-emerald-50 border-emerald-100";
        let textClass = "text-emerald-700";
        let Icon = CheckCircle2;
        let label = "Balanceado";

        if (isMissing) {
            bgClass = "bg-amber-50 border-amber-100";
            textClass = "text-amber-700";
            Icon = Scale;
            label = `Falta: ${restante.toFixed(2)} kg`;
        } else if (isExcess) {
            bgClass = "bg-rose-50 border-rose-100";
            textClass = "text-rose-700";
            Icon = AlertTriangle;
            label = `Exceso: ${Math.abs(restante).toFixed(2)} kg`;
        }

        return (
            <div className={`mb-4 p-4 rounded-xl border flex justify-between items-center gap-4 ${bgClass}`}>
                <div>
                     <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Total Báscula</span>
                     <span className="text-xl font-bold text-slate-800">{Number(kgBascula).toFixed(2)} kg</span>
                </div>
                <div className="text-right">
                    <div className={`text-sm font-bold flex items-center justify-end gap-2 ${textClass}`}>
                        <Icon size={18}/> {isBalanced ? "Balanceado" : "Descuadre"}
                    </div>
                    {!isBalanced && (
                        <span className={`text-xs font-bold ${isExcess ? "text-rose-600" : "text-amber-600"}`}>
                            {label}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="mb-6 bg-slate-50/60 p-5 rounded-2xl border border-blue-100">


            <SectionHeader icon={Scale} title="Clasificación y Rechazo" onEdit={isEditing ? handleSave : () => setIsEditing(true)} isEditing={isEditing} loading={loading} canEdit={canEdit} />
            
            {(isEditing || localClasif.length > 0 || localRechazos.length > 0) && <BalanceHeader />}

            {/* TABLA COMERCIAL */}
            <div className="mb-6">
                <h5 className="text-xs font-bold text-emerald-700 mb-2 uppercase flex items-center gap-1"><Leaf size={12}/> Destinos Comerciales</h5>
                {localClasif.length === 0 && !isEditing ? (
                     <div className="text-slate-400 text-xs italic">Sin registros comerciales.</div>
                ) : (
                    <Tabla>
                        <TablaCabecera>
                            <TablaHead>Destino</TablaHead>
                            <TablaHead align="center">Gabetas</TablaHead>
                            <TablaHead align="center">Prom(kg)</TablaHead>
                            <TablaHead align="right">Total Kg</TablaHead>
                            {isEditing && <TablaHead></TablaHead>}
                        </TablaCabecera>
                        <TablaCuerpo>
                            {localClasif.map((row, i) => (
                                <TablaFila key={i}>
                                    <TablaCelda>
                                        {isEditing ? (
                                            <select className="w-full text-xs border rounded p-1" value={row.destino || ""} onChange={e => updateClasif(i, 'destino', e.target.value)}>
                                                <option value="">Seleccione</option>
                                                {DESTINOS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                            </select>
                                        ) : <span className="font-bold text-slate-700">{row.destino}</span>}
                                    </TablaCelda>
                                    <TablaCelda align="center">{isEditing ? <input type="number" className="w-14 text-center border rounded p-1" value={row.gabetas || ""} onChange={e => updateClasif(i, 'gabetas', e.target.value)}/> : row.gabetas}</TablaCelda>
                                    <TablaCelda align="center">{isEditing ? <input type="number" className="w-14 text-center border rounded p-1" value={row.peso_promedio_gabeta_kg || ""} onChange={e => updateClasif(i, 'peso_promedio_gabeta_kg', e.target.value)}/> : row.peso_promedio_gabeta_kg}</TablaCelda>
                                    
                                    {/* ✅ FIX: CONTROLLED INPUT (|| "") */}
                                    <TablaCelda align="right">
                                        {isEditing ? (
                                            <input 
                                                type="number" 
                                                className="w-20 text-right border border-emerald-300 rounded p-1 font-bold text-emerald-800 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none" 
                                                value={row.kg || ""} 
                                                onChange={e => updateClasif(i, 'kg', e.target.value)}
                                            />
                                        ) : (
                                            <span className="font-bold text-emerald-700">{row.kg}</span>
                                        )}
                                    </TablaCelda>
                                    
                                    {isEditing && <TablaCelda><button onClick={() => removeClasif(i)} className="text-rose-400 p-1"><Trash2 size={14}/></button></TablaCelda>}
                                </TablaFila>
                            ))}
                        </TablaCuerpo>
                    </Tabla>
                )}
                {isEditing && <button onClick={addClasif} className="mt-2 text-xs text-emerald-600 font-bold flex items-center gap-1 hover:underline"><Plus size={12}/> Agregar Destino</button>}
            </div>

            {/* TABLA RECHAZO */}
            <div>
                <h5 className="text-xs font-bold text-rose-700 mb-2 uppercase flex items-center gap-1"><AlertTriangle size={12}/> Rechazo / Merma</h5>
                {localRechazos.length === 0 && !isEditing ? (
                     <div className="text-slate-400 text-xs italic">Sin rechazos registrados.</div>
                ) : (
                    <Tabla>
                        <TablaCabecera>
                            <TablaHead>Causa</TablaHead>
                            <TablaHead>Obs.</TablaHead>
                            <TablaHead align="right">Total Kg</TablaHead>
                            {isEditing && <TablaHead></TablaHead>}
                        </TablaCabecera>
                        <TablaCuerpo>
                            {localRechazos.map((row, i) => (
                                <TablaFila key={i}>
                                    <TablaCelda>
                                        {isEditing ? (
                                            <select className="w-full text-xs border rounded p-1" value={row.causa || ""} onChange={e => updateRechazo(i, 'causa', e.target.value)}>
                                                <option value="">Seleccione</option>
                                                {CAUSAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                            </select>
                                        ) : <span className="text-slate-700">{row.causa}</span>}
                                    </TablaCelda>
                                    <TablaCelda>{isEditing ? <input className="w-full text-xs border rounded p-1" value={row.observacion || ""} onChange={e => updateRechazo(i, 'observacion', e.target.value)}/> : <span className="italic text-xs text-slate-500">{row.observacion}</span>}</TablaCelda>
                                    
                                    {/* ✅ FIX: CONTROLLED INPUT (|| "") */}
                                    <TablaCelda align="right">
                                        {isEditing ? (
                                            <input 
                                                type="number" 
                                                className="w-20 text-right border border-rose-300 rounded p-1 font-bold text-rose-800 bg-rose-50 focus:ring-2 focus:ring-rose-500 outline-none" 
                                                value={row.kg || ""} 
                                                onChange={e => updateRechazo(i, 'kg', e.target.value)}
                                            />
                                        ) : (
                                            <span className="font-bold text-rose-700">{row.kg}</span>
                                        )}
                                    </TablaCelda>

                                    {isEditing && <TablaCelda><button onClick={() => removeRechazo(i)} className="text-rose-400 p-1"><Trash2 size={14}/></button></TablaCelda>}
                                </TablaFila>
                            ))}
                        </TablaCuerpo>
                    </Tabla>
                )}
                {isEditing && <button onClick={addRechazo} className="mt-2 text-xs text-rose-600 font-bold flex items-center gap-1 hover:underline"><Plus size={12}/> Agregar Rechazo</button>}
            </div>
        </div>
    );
};


// --- 1. CARD EDITABLE DE PESO BÁSCULA ---
// --- 1. CARD EDITABLE DE PESO BÁSCULA ---

// --- 1. CARD EDITABLE DE PESO BÁSCULA ---
// --- 1. CARD EDITABLE DE PESO BÁSCULA ---
const PesoBasculaCard = ({ plan, real, unit = "kg", tareaId, canEdit, onRefresh }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(real ?? "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isEditing) setVal(real ?? "");
  }, [real, isEditing]);

  const handleSave = async () => {
    if (!val || Number(val) <= 0) return toast.error("El peso debe ser mayor a 0");
    setLoading(true);
    try {
      await actualizarDetalles(tareaId, { kg_cosechados: Number(val) });
      if (onRefresh) await onRefresh();
      setIsEditing(false);
      toast.success("Peso registrado correctamente");
    } catch {
      toast.error("Error al guardar peso");
    } finally {
      setLoading(false);
    }
  };

  const planNum = Number(plan) || 0;
  const realNum = Number(real) || 0;
  const cumplimiento = planNum > 0 ? (realNum / planNum) * 100 : 0;
  const isLow = planNum > 0 && realNum < planNum;

  const realCardBg = isLow ? "bg-rose-50 border-rose-100" : "bg-emerald-50 border-emerald-100";
  const realTitleColor = isLow ? "text-rose-600" : "text-emerald-600";
  const realValueColor = isLow ? "text-rose-800" : "text-emerald-800";

  // Badge % (cambia con isLow)
  const badgeBg = isLow ? "bg-rose-600 text-white" : "bg-emerald-600 text-white";

  return (
    <div className="my-6">
      {/* ✅ Header independiente (solo botón a la derecha) */}
      <div className="flex items-center justify-end mb-2">
        {canEdit ? (
          <button
            onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            disabled={loading}
            className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all font-bold
              ${isEditing
                ? "bg-emerald-600 text-white shadow-md hover:bg-emerald-700"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
          >
            {loading ? "Guardando..." : isEditing ? (
              <>
                <Save size={14} /> Guardar
              </>
            ) : (
              <>
                <Edit2 size={14} /> Editar
              </>
            )}
          </button>
        ) : null}
      </div>

      {/* ✅ Cards independientes, misma altura */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* PLANIFICADO */}
        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 shadow-xs text-center flex flex-col justify-center min-h-[110px]">
          <span className="text-xs uppercase text-blue-600 font-bold tracking-wider block mb-1">
            Planificado
          </span>
          <span className="font-bold text-xl text-blue-900">
            {plan ?? "—"} {unit}
          </span>
        </div>

        {/* REAL (BÁSCULA) */}
        <div className={`${realCardBg} p-4 rounded-2xl border text-center relative overflow-hidden shadow-xs flex flex-col justify-center min-h-[110px]`}>
          {/* % esquina sup derecha con color según isLow */}
          {planNum > 0 && !isEditing && (
            <div className={`absolute top-0 right-0 ${badgeBg} text-xs px-3 py-1.5 rounded-bl-2xl font-black shadow-sm`}>
              {cumplimiento.toFixed(0)}%
            </div>
          )}

          <span className={`text-xs uppercase ${realTitleColor} font-bold tracking-wider block mb-1`}>
            Real (Báscula)
          </span>

          {isEditing ? (
            <div className="flex justify-center">
              <input
                autoFocus
                type="number"
                className="bg-white/60 border border-slate-300 rounded-xl text-center font-bold text-xl w-28 py-1 outline-none focus:ring-2 focus:ring-emerald-500"
                value={val}
                onChange={(e) => setVal(e.target.value)}
              />
            </div>
          ) : (
            <span className={`font-bold text-xl ${realValueColor}`}>
              {real ?? "0.00"} {unit}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};




// --- 2. GESTOR DE FILAS (UI TABLA) ---
const RowsManager = ({ filas = [], tareaId, canEdit, onRefresh }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localData, setLocalData] = useState(filas);
    const [loading, setLoading] = useState(false);

    useEffect(() => { if(!isEditing) setLocalData(filas); }, [filas, isEditing]);

    const handleSave = async () => {
        const invalid = localData.some(f => !f.gabetas || Number(f.gabetas) <= 0);
        if (invalid) return toast.error("Todas las filas deben tener gabetas registradas (>0).");

        setLoading(true);
        try {
            await actualizarDetalles(tareaId, { filas_recolectadas: localData });
            if (onRefresh) await onRefresh();
            setIsEditing(false);
            toast.success("Filas registradas correctamente");
        } catch { toast.error("Error guardando filas"); }
        finally { setLoading(false); }
    };

    const updateRow = (idx, val) => {
        const newData = [...localData];
        newData[idx].gabetas = val;
        setLocalData(newData);
    };
    const addRow = () => setLocalData([...localData, { numero: localData.length + 1, gabetas: "" }]);
    const removeRow = (idx) => setLocalData(localData.filter((_, i) => i !== idx).map((f, i) => ({ ...f, numero: i + 1 })));

    if (!isEditing && localData.length === 0) {
        return (
            <div className="mb-8">
                <SectionHeader icon={Layers} title="Registro de Filas" onEdit={() => setIsEditing(true)} isEditing={isEditing} canEdit={canEdit} />
                <div className="text-center p-6 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 text-sm">No se han registrado filas aún.</div>
            </div>
        );
    }

    return (
        <div className="mb-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <SectionHeader icon={Layers} title="Registro de Filas" onEdit={isEditing ? handleSave : () => setIsEditing(true)} isEditing={isEditing} loading={loading} canEdit={canEdit} />
            
            <Tabla>
                <TablaCabecera>
                    <TablaHead>Fila</TablaHead>
                    <TablaHead align="center">Gabetas</TablaHead>
                    {isEditing && <TablaHead align="right">Acción</TablaHead>}
                </TablaCabecera>
                <TablaCuerpo>
                    {localData.map((f, i) => (
                        <TablaFila key={i}>
                            <TablaCelda className="font-bold text-slate-700">Fila {f.numero}</TablaCelda>
                            <TablaCelda align="center">
                                {isEditing ? (
                                    // ✅ FIX: Controlled input
                                    <input type="number" className="w-20 text-center border border-slate-300 rounded px-2 py-1 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500" value={f.gabetas || ""} onChange={(e) => updateRow(i, e.target.value)} />
                                ) : (
                                    <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded">{f.gabetas}</span>
                                )}
                            </TablaCelda>
                            {isEditing && (
                                <TablaCelda align="right">
                                    <button onClick={() => removeRow(i)} className="text-rose-400 hover:text-rose-600 bg-rose-50 p-1.5 rounded"><Trash2 size={16}/></button>
                                </TablaCelda>
                            )}
                        </TablaFila>
                    ))}
                </TablaCuerpo>
            </Tabla>
            
            {isEditing && (
                <button onClick={addRow} className="mt-3 w-full py-2 border border-dashed border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-emerald-600 text-xs font-bold flex justify-center items-center gap-2">
                    <Plus size={14}/> Agregar Fila
                </button>
            )}
        </div>
    );
};

// --- 3. LOGÍSTICA (Inputs + Tabla) ---
const LogisticsManager = ({ entrega = {}, tareaId, canEdit, onRefresh }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [data, setData] = useState({
        centro_acopio: entrega.centro_acopio || "",
        gabetas_entregadas: entrega.gabetas_entregadas || 0,
        gabetas_devueltas: entrega.gabetas_devueltas || 0
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => { if(!isEditing) setData({
        centro_acopio: entrega.centro_acopio || "",
        gabetas_entregadas: entrega.gabetas_entregadas || 0,
        gabetas_devueltas: entrega.gabetas_devueltas || 0
    }); }, [entrega, isEditing]);

    const handleSave = async () => {
        if(!data.centro_acopio) return toast.error("El centro de acopio es obligatorio");
        setLoading(true);
        try {
            await actualizarDetalles(tareaId, { entrega: data });
            if (onRefresh) await onRefresh();
            setIsEditing(false);
            toast.success("Logística actualizada");
        } catch { toast.error("Error guardando logística"); }
        finally { setLoading(false); }
    };

    const netas = (Number(data.gabetas_entregadas) || 0) - (Number(data.gabetas_devueltas) || 0);

    return (
        <div className="mb-8 bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">
            <SectionHeader icon={Truck} title="Logística de Entrega" onEdit={isEditing ? handleSave : () => setIsEditing(true)} isEditing={isEditing} loading={loading} canEdit={canEdit} />
            
            <div className="mb-4">
                {isEditing ? (
                    <Input label="Centro de Acopio" value={data.centro_acopio || ""} onChange={(e) => setData({...data, centro_acopio: e.target.value})} placeholder="Ej. Acopio Sur" />
                ) : (
                    <div className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="font-bold uppercase text-xs text-slate-400">Centro:</span> {data.centro_acopio || "N/A"}
                    </div>
                )}
            </div>

            <Tabla>
                <TablaCabecera>
                    <TablaHead align="center">Entregadas</TablaHead>
                    <TablaHead align="center">Devueltas</TablaHead>
                    <TablaHead align="center">Total Netas</TablaHead>
                </TablaCabecera>
                <TablaCuerpo>
                    <TablaFila>
                        <TablaCelda align="center">
                            {/* ✅ FIX: Controlled input */}
                            {isEditing ? <input type="number" min="0" className="w-20 text-center border rounded p-1 font-bold" value={data.gabetas_entregadas || ""} onChange={(e) => setData({...data, gabetas_entregadas: e.target.value})} /> : data.gabetas_entregadas}
                        </TablaCelda>
                        <TablaCelda align="center">
                             {/* ✅ FIX: Controlled input */}
                             {isEditing ? <input type="number" min="0" className="w-20 text-center border rounded p-1 font-bold text-rose-600" value={data.gabetas_devueltas || ""} onChange={(e) => setData({...data, gabetas_devueltas: e.target.value})} /> : <span className="text-rose-600 font-bold">{data.gabetas_devueltas}</span>}
                        </TablaCelda>
                        <TablaCelda align="center" className="font-black text-lg text-emerald-700">
                            {netas}
                        </TablaCelda>
                    </TablaFila>
                </TablaCuerpo>
            </Tabla>
        </div>
    );
};

// --- 4. LIQUIDACIÓN (Tabla) ---
const SettlementManager = ({ liquidacion = [], tareaId, canEdit, onRefresh }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localData, setLocalData] = useState(liquidacion);
    const [loading, setLoading] = useState(false);

    useEffect(() => { if(!isEditing) setLocalData(liquidacion); }, [liquidacion, isEditing]);

    const handleSave = async () => {
        const invalid = localData.some(i => !i.gabetas || Number(i.gabetas) <= 0);
        if (invalid) return toast.error("La cantidad de gabetas debe ser positiva.");

        setLoading(true);
        try {
            await actualizarDetalles(tareaId, { liquidacion: localData });
            if (onRefresh) await onRefresh();
            setIsEditing(false);
            toast.success("Liquidación registrada");
        } catch { toast.error("Error guardando liquidación"); }
        finally { setLoading(false); }
    };

    const updateRow = (idx, field, val) => setLocalData(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
    const addRow = () => setLocalData([...localData, { calidad: "Primera", gabetas: "", novedad: "", valor_total: "" }]);
    const removeRow = (idx) => setLocalData(prev => prev.filter((_, i) => i !== idx));
    const totalDinero = localData.reduce((acc, item) => acc + (Number(item.valor_total) || 0), 0);

    return (
        <div className="mb-8 bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
            <SectionHeader icon={DollarSign} title="Liquidación Financiera" onEdit={isEditing ? handleSave : () => setIsEditing(true)} isEditing={isEditing} loading={loading} canEdit={canEdit} />
            
            <Tabla>
                <TablaCabecera>
                    <TablaHead>Calidad</TablaHead>
                    <TablaHead align="center">Cant.</TablaHead>
                    <TablaHead>Novedad</TablaHead>
                    <TablaHead align="right">Valor ($)</TablaHead>
                    {isEditing && <TablaHead className="w-10"></TablaHead>}
                </TablaCabecera>
                <TablaCuerpo>
                    {localData.map((item, i) => (
                        <TablaFila key={i}>
                            <TablaCelda>
                                {isEditing ? (
                                    <select className="w-full text-xs border rounded p-1" value={item.calidad || ""} onChange={(e) => updateRow(i, "calidad", e.target.value)}>
                                        <option>Primera</option><option>Segunda</option><option>Tercera</option><option>Rechazo</option>
                                    </select>
                                ) : <span className="font-bold text-slate-700">{item.calidad}</span>}
                            </TablaCelda>
                            <TablaCelda align="center">
                                {/* ✅ FIX: Controlled input */}
                                {isEditing ? <input type="number" className="w-16 text-center border rounded p-1" value={item.gabetas || ""} onChange={(e) => updateRow(i, "gabetas", e.target.value)}/> : item.gabetas}
                            </TablaCelda>
                            <TablaCelda>
                                {/* ✅ FIX: Controlled input */}
                                {isEditing ? <input type="text" className="w-full text-xs border rounded p-1" value={item.novedad || ""} onChange={(e) => updateRow(i, "novedad", e.target.value)}/> : <span className="text-xs text-slate-500 italic">{item.novedad || "-"}</span>}
                            </TablaCelda>
                            <TablaCelda align="right" className="font-mono font-medium text-slate-700">
                                {/* ✅ FIX: Controlled input */}
                                {isEditing ? <input type="number" className="w-24 text-right border rounded p-1 font-bold" value={item.valor_total || ""} onChange={(e) => updateRow(i, "valor_total", e.target.value)}/> : fmtUSD(item.valor_total)}
                            </TablaCelda>
                            {isEditing && <TablaCelda><button onClick={() => removeRow(i)} className="text-rose-400 bg-rose-50 p-1 rounded"><Trash2 size={14}/></button></TablaCelda>}
                        </TablaFila>
                    ))}
                    <tr className="bg-emerald-50 border-t border-emerald-100">
                        <td colSpan={isEditing ? 3 : 3} className="px-4 py-3 text-right text-xs font-bold text-emerald-800 uppercase">Total Recibido</td>
                        <td className="px-4 py-3 text-right font-black text-emerald-700 text-lg">{fmtUSD(totalDinero)}</td>
                        {isEditing && <td></td>}
                    </tr>
                </TablaCuerpo>
            </Tabla>

            {isEditing && (
                <button onClick={addRow} className="mt-3 w-full py-2 border border-dashed border-emerald-200 bg-emerald-50/50 rounded-lg text-emerald-600 hover:bg-emerald-100 text-xs font-bold flex justify-center items-center gap-2"><Plus size={14}/> Agregar Item</button>
            )}
        </div>
    );
};

// --- VISTA PRINCIPAL COSECHA ---
const DetailsCosecha = ({ data, tareaId, onRefresh, estado }) => {
    // 1. REGLA: ¿Hay peso?
    const hasWeight = Number(data.kg_cosechados) > 0;
    
    // 2. REGLA: ¿Está clasificado y balanceado?
    const totalClasif = (data.clasificacion || []).reduce((acc, c) => acc + (Number(c.kg)||0), 0);
    const totalRechazo = (data.rechazos || []).reduce((acc, r) => acc + (Number(r.kg)||0), 0);
    const totalProcesado = totalClasif + totalRechazo;
    const isClassified = hasWeight && Math.abs((Number(data.kg_cosechados)||0) - totalProcesado) < 0.05;

    const canEdit = !["Verificada", "Cancelada"].includes(estado);

    return (
        <div className="space-y-6">
            
            <PesoBasculaCard 
                plan={data.kg_planificados} 
                real={data.kg_cosechados} 
                tareaId={tareaId} 
                canEdit={canEdit} 
                onRefresh={onRefresh} 
            />

            <RowsManager 
                filas={data.filas_recolectadas || []} 
                tareaId={tareaId} 
                canEdit={canEdit} 
                onRefresh={onRefresh} 
            />

            {hasWeight ? (
                <ClassificationManager 
                    clasificacion={data.clasificacion || []} 
                    rechazos={data.rechazos || []} 
                    kgBascula={data.kg_cosechados} 
                    tareaId={tareaId} 
                    canEdit={canEdit} 
                    onRefresh={onRefresh} 
                />
            ) : (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center text-slate-400 text-sm italic">
                    <Scale size={20} className="mx-auto mb-2 opacity-50"/>
                    Registra el <strong>Peso en Báscula</strong> para habilitar la clasificación.
                </div>
            )}

            {isClassified ? (
                <>
                    <LogisticsManager entrega={data.entrega || {}} tareaId={tareaId} canEdit={canEdit} onRefresh={onRefresh} />
                    <SettlementManager liquidacion={data.liquidacion || []} tareaId={tareaId} canEdit={canEdit} onRefresh={onRefresh} />
                </>
            ) : hasWeight && (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-center text-amber-800 text-sm">
                    <AlertTriangle size={24} className="mx-auto mb-2 text-amber-500"/>
                    Debes completar la <strong>Clasificación y Rechazo</strong> (cuadrando los kilos) antes de registrar logística y liquidación.
                </div>
            )}
        </div>
    );
};

export default function TaskSpecificDetails({ tarea, onRefresh }) {
  if (!tarea) return null;
  const tipoCodigo = (tarea.tipo_codigo || tarea.TipoActividad?.codigo || "").toLowerCase().trim();
  let data = tarea[tipoCodigo];
  if (!data && tarea.detalles) data = tarea.detalles;
  if (!data) return <div className="text-slate-400 text-sm italic p-4 text-center bg-slate-50 rounded-xl">Sin detalles registrados.</div>;

  switch (tipoCodigo) {
    case "cosecha": return <DetailsCosecha data={data || tarea.tareaCosecha} tareaId={tarea.id} onRefresh={onRefresh} estado={tarea.estado} />;
    case "poda": return <DetailsPoda data={data} />;
    case "maleza": return <DetailsMaleza data={data} />;
    case "nutricion": return <DetailsNutricion data={data} isWorker={false} />; 
    case "fitosanitario": return <DetailsFitosanitario data={data} isWorker={false} />;
    case "enfundado": return <DetailsEnfundado data={data} />;
    default: return <div className="text-slate-400 text-sm italic p-4 text-center bg-slate-50 rounded-xl">Detalles disponibles en breve.</div>;
  }
}
