// frontend/src/pages/Dashboard.jsx
import React from "react";

export default function Dashboard() {
  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <h1 className="text-2xl font-extrabold text-slate-900">Dashboard</h1>
          <p className="mt-2 text-slate-500">
            En construcción.
          </p>

          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <div className="text-lg font-bold text-slate-800">🚧 En construcción</div>
            <div className="mt-2 text-sm text-slate-500">
              Esta sección se habilitará próximamente con indicadores y accesos rápidos.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
