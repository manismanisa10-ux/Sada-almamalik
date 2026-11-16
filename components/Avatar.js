const COLORS = ["#8E73C9", "#B8902F", "#4F8A8B", "#C2576B", "#5B7DB1", "#7A9E3D", "#C0762B", "#7B5EA7"];

export function colorFor(s = "") {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

export default function Avatar({ name = "؟", size = 36 }) {
  const ch = [...name.trim()][0] || "؟";
  return (
    <span className="avatar" style={{ width: size, height: size, background: colorFor(name), fontSize: size * 0.45 }}>
      {ch}
    </span>
  );
}
