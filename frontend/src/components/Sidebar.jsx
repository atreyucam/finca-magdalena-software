import { NavLink } from "react-router-dom";
import { clsx } from "clsx";

export default function Sidebar({ items }) {
  return (
    <aside className="w-56 border-r bg-white">
      <nav className="p-3 space-y-1">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) =>
              clsx(
                "block rounded-md px-3 py-2 text-sm",
                isActive ? "bg-gray-900 text-white" : "hover:bg-gray-100"
              )
            }
          >
            {it.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
