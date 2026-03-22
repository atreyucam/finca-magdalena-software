import { useEffect, useState } from "react";
import { Loader2, Search, UserPlus, Users, X } from "lucide-react";
import { listarClientes } from "../../api/apiClient";
import useToast from "../../hooks/useToast";
import Input from "../ui/Input";
import Boton from "../ui/Boton";
import {
  Tabla,
  TablaCabecera,
  TablaHead,
  TablaCuerpo,
  TablaFila,
  TablaCelda,
  TablaVacia,
} from "../ui/Tabla";
import FormularioClienteRapido from "./FormularioClienteRapido";

export default function SelectorClienteVentaModal({ abierto, onCancelar, onSeleccionar }) {
  const toast = useToast();
  const [vista, setVista] = useState("buscar");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!abierto) {
      setVista("buscar");
      setQ("");
      setDebouncedQ("");
      setClientes([]);
      setCargando(false);
    }
  }, [abierto]);

  useEffect(() => {
    if (!abierto || vista !== "buscar") return;

    const timeout = window.setTimeout(() => {
      setDebouncedQ(q);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [abierto, q, vista]);

  useEffect(() => {
    if (!abierto || vista !== "buscar") return;

    let active = true;
    const run = async () => {
      try {
        setCargando(true);
        const res = await listarClientes({ q: debouncedQ, pageSize: 30, activos: true });
        if (!active) return;
        setClientes(Array.isArray(res?.data?.data) ? res.data.data : []);
      } catch (error) {
        if (!active) return;
        toast.error(error?.response?.data?.message || "No se pudo cargar clientes");
      } finally {
        if (active) setCargando(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [abierto, debouncedQ, toast, vista]);

  if (vista === "crear") {
    return (
      <FormularioClienteRapido
        modo="crear"
        alCancelar={() => setVista("buscar")}
        alCreado={(cliente) => {
          onSeleccionar?.(cliente);
          setVista("buscar");
        }}
      />
    );
  }

  return (
    <div className="w-full">
      <div className="border-b border-slate-200 bg-slate-50/50 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex w-full items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Users size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight text-slate-900 sm:text-xl">
                Buscar cliente
              </h2>
              <p className="text-xs text-slate-500 sm:text-sm">
                Selecciona un cliente existente o registra uno nuevo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancelar}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="w-full space-y-4 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="w-full md:max-w-md">
            <Input
              label="Buscar cliente"
              placeholder="Nombre, RUC, teléfono..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              icono={Search}
            />
          </div>

          <Boton type="button" onClick={() => setVista("crear")}>
            <UserPlus className="mr-2 h-4 w-4" />
            Agregar nuevo cliente
          </Boton>
        </div>

        <div className="min-h-6">
          {cargando ? (
            <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Actualizando resultados...
            </div>
          ) : null}
        </div>

        <Tabla>
          <TablaCabecera>
            <TablaHead className="w-20">ID</TablaHead>
            <TablaHead>Nombre</TablaHead>
            <TablaHead>RUC</TablaHead>
            <TablaHead>Teléfono</TablaHead>
            <TablaHead>Dirección</TablaHead>
            <TablaHead align="right">Acción</TablaHead>
          </TablaCabecera>

          <TablaCuerpo>
            {clientes.length === 0 ? (
              <TablaVacia mensaje="No hay clientes para mostrar." colSpan={6} />
            ) : (
              clientes.map((cliente) => (
                <TablaFila key={cliente.id}>
                  <TablaCelda className="font-mono text-xs text-slate-500">
                    {cliente.id}
                  </TablaCelda>
                  <TablaCelda className="font-semibold text-slate-800">
                    {cliente.nombre || "—"}
                  </TablaCelda>
                  <TablaCelda>{cliente.identificacion || "—"}</TablaCelda>
                  <TablaCelda>{cliente.telefono || "—"}</TablaCelda>
                  <TablaCelda className="max-w-[280px]" nowrap={false}>
                    {cliente.direccion || "—"}
                  </TablaCelda>
                  <TablaCelda align="right">
                    <Boton type="button" onClick={() => onSeleccionar?.(cliente)}>
                      Seleccionar
                    </Boton>
                  </TablaCelda>
                </TablaFila>
              ))
            )}
          </TablaCuerpo>
        </Tabla>
      </div>
    </div>
  );
}
