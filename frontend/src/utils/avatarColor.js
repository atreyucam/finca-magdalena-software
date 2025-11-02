// src/utils/avatarColor.js

const COLORS = [
  "#E57373", "#F06292", "#BA68C8", "#64B5F6",
  "#4DB6AC", "#81C784", "#FFD54F", "#FFB74D",
  "#A1887F", "#90A4AE", "#9575CD", "#4FC3F7",
  "#7986CB", "#AED581", "#FF8A65", "#4DD0E1",
];

const normalize = (s = "") => s.toString().trim().toLowerCase();

/** Semilla consistente para usuarios en TODO el sistema */
export function getUserSeed(u) {
  return normalize(
    u?.email ||
    u?.cedula ||
    u?.id ||
    `${u?.nombres || u?.nombre || ""} ${u?.apellidos || ""}`
  );
}

export function getAvatarColor(seed = "") {
  const s = normalize(seed);
  if (!s) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLORS.length;
  return COLORS[index];
}

export function getContrastColor(hex) {
  const c = hex.substring(1);
  const rgb = parseInt(c, 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = rgb & 0xff;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? "#111" : "#fff";
}
