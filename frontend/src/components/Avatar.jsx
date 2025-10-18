import React from "react";

// Función para obtener iniciales del nombre
const getInitials = (name = "") =>
  name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

// Función para asignar color aleatorio estable
const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 80%)`;
};

// Componente Avatar
export default function Avatar({
  src,
  name = "",
  size = 36,
  icon = null,
  className = "",
  style = {},
}) {
  const initials = getInitials(name);
  const bgColor = stringToColor(name || "User");

  return (
    <div
      className={`flex items-center justify-center rounded-full border border-white shadow-sm overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        backgroundColor: src ? "transparent" : bgColor,
        ...style,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover rounded-full"
        />
      ) : icon ? (
        icon
      ) : (
        <span className="font-semibold text-slate-700">{initials}</span>
      )}
    </div>
  );
}
