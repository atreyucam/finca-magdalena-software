// src/components/Avatar.jsx
import React, { useMemo } from "react";
import { getAvatarColor, getContrastColor, getUserSeed } from "../utils/avatarColor";

/**
 * Avatar con color determinístico.
 *
 * Props:
 * - user: objeto usuario (opcional) -> se usará para generar la semilla estable
 * - name: nombre para iniciales / title
 * - email, seed: opcionales; seed tiene prioridad
 * - size, className, rounded
 */
export default function Avatar({
  user = null,
  name = "",
  email = "",
  seed = "",
  size = 36,
  className = "",
  rounded = "full",
}) {
  // 👇 Semilla unificada y normalizada
  const baseSeed = useMemo(() => {
    return seed || getUserSeed(user) || email || name || "";
  }, [seed, user, email, name]);

  const bg = useMemo(() => getAvatarColor(baseSeed), [baseSeed]);
  const fg = useMemo(() => getContrastColor(bg), [bg]);

  const initials = useMemo(() => {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map(p => p[0]?.toUpperCase()).join("") || "U";
  }, [name]);

  const radiusClass = rounded === "xl" ? "rounded-xl" : "rounded-full";

  return (
    <div
      title={name || undefined}
      className={`inline-flex items-center justify-center font-semibold select-none ${radiusClass} ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        color: fg,
        fontSize: Math.max(10, Math.floor(size * 0.38)),
        lineHeight: 1,
      }}
    >
      {initials}
    </div>
  );
}
