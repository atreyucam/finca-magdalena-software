import LayoutPrincipal from "../components/layout/LayoutPrincipal";

/* --- Items de navegación WORKER --- */
const BASE_URL = "/worker";
const ITEMS_NAVEGACION = [
  { to: `${BASE_URL}/mis-tareas`, label: "Mis tareas" },
  { to: `${BASE_URL}/mi-perfil`, label: "Mi perfil" },
  { to: `${BASE_URL}/notificaciones`, label: "Notificaciones" },
];

export default function WorkerLayout(){
    return <LayoutPrincipal itemsMenu={ITEMS_NAVEGACION} />;

}