export default function ModuloPreparacion({ titulo = "Modulo en preparacion", descripcion = "Esta seccion quedo preparada para la siguiente etapa." }) {
  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">{titulo}</h1>
        <p className="mt-2 text-slate-600 max-w-2xl">{descripcion}</p>
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
          Estructura de navegacion y rutas lista para implementacion funcional en etapa de Compras/Ventas.
        </div>
      </div>
    </section>
  );
}
