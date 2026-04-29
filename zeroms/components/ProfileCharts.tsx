type Row = {
  created_at: string;
  wpm: number;
};

function buildLine(points: { x: number; y: number }[], w: number, h: number) {
  if (points.length === 0) return "";
  const maxX = Math.max(1, points.length - 1);
  const maxY = Math.max(10, ...points.map((p) => p.y)) + 10;
  return points
    .map((p, i) => {
      const x = (i / maxX) * w;
      const y = h - (p.y / maxY) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function ProfileCharts(props: {
  last20Chrono: Row[];
  personalBestWpm: number;
}) {
  const w = 800;
  const h = 120;
  const points = props.last20Chrono.map((r) => ({ x: 0, y: r.wpm }));
  const poly = buildLine(points, w, h);
  const maxY = Math.max(10, ...points.map((p) => p.y), props.personalBestWpm) + 10;
  const dashY = h - (props.personalBestWpm / maxY) * h;

  return (
    <div className="mt-8">
      <div className="text-zinc-600 text-sm mb-2">WPM (last 20, chronological)</div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="profile-wpm-chart">
        <line
          x1="0"
          y1={dashY}
          x2={w}
          y2={dashY}
          stroke="#52525b"
          strokeWidth="1"
          strokeDasharray="6 4"
        />
        <polyline
          points={poly}
          fill="none"
          stroke="#00ff41"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
