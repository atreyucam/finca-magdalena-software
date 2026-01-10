// src/pages/DetalleUsuario.jsx
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  obtenerUsuario,
  obtenerPagosUsuario,
  editarUsuario as apiEditarUsuario,
  desactivarUsuario as apiDesactivarUsuario,
  listarTareasUsuarioPorSemana,
} from "../api/apiClient";
import { ArrowLeft, Edit, CheckCircle, XCircle } from "lucide-react";

import ModalEditarUsuario from "../components/usuarios/ModalEditarUsuario";
import HistorialSemanas from "../components/usuarios/HistorialSemanas";

export default function DetalleUsuario() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagos, setPagos] = useState([]);
  const [semanasTareas, setSemanasTareas] = useState([]);

  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [procesandoEstado, setProcesandoEstado] = useState(false);

  // ✅ Tabs estilo switch
  const [tab, setTab] = useState("pagos"); // "pagos" | "tareas"

  const cargarDatos = useCallback(async () => {
    try {
      const uRes = await obtenerUsuario(id);
      setUsuario(uRes.data || uRes);

      try {
        const pagosRes = await obtenerPagosUsuario(id);
        setPagos(pagosRes?.data || pagosRes || []);
      } catch (e) {
        console.error("Error pagos", e);
        setPagos([]);
      }

      try {
        const res = await listarTareasUsuarioPorSemana(id);
        setSemanasTareas(res?.data || []);
      } catch (e) {
        console.error("Error historial tareas (semanas)", e);
        setSemanasTareas([]);
      }
    } catch (err) {
      console.error("Error cargando detalle:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    cargarDatos();
  }, [cargarDatos]);

  const toggleEstado = async () => {
    const activar = usuario.estado !== "Activo";
    const ok = window.confirm(activar ? "¿Activar usuario?" : "¿Desactivar usuario?");
    if (!ok) return;

    try {
      setProcesandoEstado(true);
      if (activar) await apiEditarUsuario(id, { estado: "Activo" });
      else await apiDesactivarUsuario(id);
      await cargarDatos();
    } catch (e) {
      alert(e?.response?.data?.message || "Error cambiando estado");
    } finally {
      setProcesandoEstado(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 rounded-full border-t-transparent"></div>
      </div>
    );

  if (!usuario) return <p className="text-rose-600 p-6">Usuario no encontrado</p>;

  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto mb-4">
        <button
          onClick={() => navigate("/owner/usuarios")}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a usuarios
        </button>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* SIDEBAR */}
        <aside className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 h-fit">
          <div className="flex flex-col items-center text-center">
            <div className="h-24 w-24 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-3xl font-bold text-slate-400 mb-4 shadow-inner">
              {usuario.nombres?.[0]}
              {usuario.apellidos?.[0]}
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              {usuario.nombres} {usuario.apellidos}
            </h2>

            <div className="flex flex-col items-center gap-2 mt-1">
              <p className="text-slate-500 text-sm font-medium">{usuario.role}</p>

              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  usuario.tipo === "Fijo"
                    ? "bg-blue-50 text-blue-700 border-blue-100"
                    : "bg-amber-50 text-amber-700 border-amber-100"
                }`}
              >
                {usuario.tipo || "Fijo"}
              </span>
            </div>

            <div className="mt-4">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${
                  usuario.estado === "Activo"
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-rose-50 text-rose-700 ring-rose-200"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${usuario.estado === "Activo" ? "bg-emerald-500" : "bg-rose-500"}`} />
                {usuario.estado}
              </span>
            </div>
          </div>

          <dl className="mt-8 space-y-5 text-sm">
            {usuario.tipo === "Fijo" && (
              <div className="bg-slate-50 -mx-2 p-3 rounded-xl border border-slate-100">
                <dt className="text-xs font-bold text-slate-500 uppercase mb-1">Email / Acceso</dt>
                <dd className="font-medium text-slate-900 break-all">
                  {usuario.email || <span className="text-slate-400 italic">Sin email configurado</span>}
                </dd>
              </div>
            )}

            <div>
              <dt className="text-slate-500 mb-1">Teléfono</dt>
              <dd className="font-medium text-slate-900">{usuario.telefono || "-"}</dd>
            </div>

            <div>
              <dt className="text-slate-500 mb-1">Cédula</dt>
              <dd className="font-medium text-slate-900">{usuario.cedula}</dd>
            </div>

            <div>
              <dt className="text-slate-500 mb-1">Dirección</dt>
              <dd className="font-medium text-slate-900">{usuario.direccion || "-"}</dd>
            </div>

            <div>
              <dt className="text-slate-500 mb-1">Fecha ingreso</dt>
              <dd className="font-medium text-slate-700 bg-slate-100 inline-block px-2 py-1 rounded-lg">
                {usuario.fecha_ingreso || "-"}
              </dd>
            </div>
          </dl>

          <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col gap-3">
            <button
              onClick={() => setModalEditarAbierto(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-sm"
            >
              <Edit size={16} /> Editar Perfil
            </button>

            <button
              onClick={toggleEstado}
              disabled={procesandoEstado}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors border ${
                usuario.estado === "Activo"
                  ? "text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-100"
                  : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-100"
              } disabled:opacity-60`}
            >
              {usuario.estado === "Activo" ? (
                <>
                  <XCircle size={18} /> {procesandoEstado ? "..." : "Desactivar Usuario"}
                </>
              ) : (
                <>
                  <CheckCircle size={18} /> {procesandoEstado ? "..." : "Activar Usuario"}
                </>
              )}
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 sm:p-6 h-fit min-h-[500px]">
          {/* ✅ Switch de Tabs (tu estilo) */}
          <div className="flex border-b border-slate-100 pb-4 mb-6">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setTab("pagos")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === "pagos"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                }`}
              >
                Pagos y nómina
              </button>

              <button
                onClick={() => setTab("tareas")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === "tareas"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                }`}
              >
                Historial de tareas
              </button>
            </div>
          </div>

          {/* ✅ CONTENIDO */}
          {tab === "pagos" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {pagos.length === 0 ? (
                <div className="text-center py-10">
                  <div className="bg-slate-50 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">💰</span>
                  </div>
                  <p className="text-slate-500">No hay registros de pagos aún.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-bold tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Semana</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {pagos.map((p) => (
                        <tr key={p.id} className="bg-white hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">{p.semana_iso || "S/N"}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold ${
                                p.estado_pago === "Pagado"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {p.estado_pago}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-700">${p.monto_total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "tareas" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <HistorialSemanas
                semanas={semanasTareas}
                onVerDetalle={(t) => navigate(`/owner/detalleTarea/${t.id}`)}
              />
            </div>
          )}
        </main>
      </div>

      {/* MODAL */}
      {usuario && (
        <ModalEditarUsuario
          usuario={usuario}
          abierto={modalEditarAbierto}
          cerrar={() => setModalEditarAbierto(false)}
          alGuardar={() => cargarDatos()}
        />
      )}
    </section>
  );
}
