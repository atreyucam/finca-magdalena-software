// src/layouts/OwnerLayout.jsx (Refactorizado)
import LayoutPrincipal from "../components/layout/LayoutPrincipal";

const BASE_URL = "/owner";

const ITEMS_NAVEGACION = [
  { to: `${BASE_URL}/dashboard`, label: "Dashboard" },
  { to: `${BASE_URL}/tareas`, label: "Tareas" },
  { to: `${BASE_URL}/inventario`, label: "Inventario" },
  { to: `${BASE_URL}/compras`, label: "Compras" },
  {
    to: `${BASE_URL}/ventas`,
    label: "Ventas",
    children: [{ to: `${BASE_URL}/ventas/clientes`, label: "Clientes" }],
  },
  { to: `${BASE_URL}/produccion`, label: "Producción" },
  { to: `${BASE_URL}/usuarios`, label: "Usuarios" },
  { to: `${BASE_URL}/pagos`, label: "Pagos" },
  { to: `${BASE_URL}/metricas`, label: "Reportes" },
  { to: `${BASE_URL}/notificaciones`, label: "Notificaciones" },
];
export default function OwnerLayout() {
  return <LayoutPrincipal itemsMenu={ITEMS_NAVEGACION} />;
}
