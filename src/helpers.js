export const AVATAR_COLORS = ["#22a06b", "#3d7eaa", "#8e5bb5", "#d9822b", "#c94f6d", "#4b8f8c", "#7a8b3a", "#5a5f9e"];

export const colorFor = (s = "") => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

export const cleanUser = (s) => s.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
export const dmKey = (a, b) => "dm:" + [a, b].sort().join("~");

export const fmtTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
export const dayKey = (ts) => new Date(ts).toDateString();

export function fmtDay(ts) {
  const d = new Date(ts);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export function rel(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  if (s < 86400 * 7) return Math.floor(s / 86400) + "d";
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

export const lastTs = (c) => (c.msgs.length ? c.msgs[c.msgs.length - 1].ts : c.group?.created || 0);
export const sortChats = (list) => [...list].sort((a, b) => lastTs(b) - lastTs(a));
