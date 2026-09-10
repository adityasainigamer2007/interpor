/** Tiny inline area chart for the last fortnight of logged hours. */
export function Sparkline({
  points,
  width = 260,
  height = 46,
}: {
  points: { date: string; hours: number }[];
  width?: number;
  height?: number;
}) {
  if (points.length < 2) return null;

  const max = Math.max(1, ...points.map((p) => p.hours));
  const step = width / (points.length - 1);
  const y = (hours: number) => height - 3 - (hours / max) * (height - 8);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${y(p.hours).toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Hours logged over the last ${points.length} days`}
    >
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.34" />
          <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark)" />
      <path d={line} fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
