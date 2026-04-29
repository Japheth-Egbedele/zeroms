import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ProfileCharts } from "@/components/ProfileCharts";

const HEAT_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

type Row = {
  id: string;
  created_at: string;
  mode: string;
  wpm: number;
  accuracy: number;
  consistency: number | null;
  rank_tier: string;
  error_map: Record<string, number> | null;
  duration_seconds: number | null;
};

function mergeErrorMaps(rows: Row[]) {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const em = r.error_map;
    if (!em) continue;
    for (const [k, v] of Object.entries(em)) {
      out[k] = (out[k] ?? 0) + v;
    }
  }
  return out;
}

function favoriteMode(rows: Row[]) {
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.mode] = (counts[r.mode] ?? 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top?.[0] ?? "—";
}

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function heatClass(n: number) {
  if (n === 0) return "bg-zinc-700";
  if (n <= 2) return "bg-yellow-400";
  return "bg-red-500";
}

export default async function ProfilePage(props: { params: Promise<{ handle: string }> }) {
  const { handle } = await props.params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <main className="min-h-screen px-8 py-10 font-mono">
        <div className="text-zinc-600 text-sm">
          Missing Supabase env vars. Set `.env.local` and reload.
        </div>
      </main>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, handle, rank_tier")
    .eq("handle", handle)
    .maybeSingle();

  const userId = profile?.user_id ?? null;

  const { data: results } = userId
    ? await supabase
        .from("leaderboard_public")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200)
    : { data: [] as Row[] };

  const rows = (results ?? []) as Row[];

  let bestWpm = 0;
  let bestAcc = 0;
  let bestCons = 0;
  let totalSeconds = 0;
  for (const r of rows) {
    bestWpm = Math.max(bestWpm, r.wpm ?? 0);
    bestAcc = Math.max(bestAcc, Number(r.accuracy ?? 0));
    bestCons = Math.max(bestCons, r.consistency ?? 0);
    totalSeconds += r.duration_seconds ?? 0;
  }

  const last10 = rows.slice(0, 10);
  const avgWpmLast10 = last10.length
    ? Math.round(last10.reduce((s, r) => s + r.wpm, 0) / last10.length)
    : 0;

  const merged = mergeErrorMaps(rows);
  const topWeak = Object.entries(merged)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const last20Chrono = rows
    .slice(0, 20)
    .map((r) => ({ created_at: r.created_at, wpm: r.wpm }))
    .reverse();

  return (
    <main className="min-h-screen px-8 py-10 font-mono">
      <div className="text-2xl text-green-400">{profile?.handle ?? handle}</div>
      <div className="text-sm text-zinc-600 mt-1">[{profile?.rank_tier ?? "USER"}]</div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-zinc-400">
        <div>Best WPM · {bestWpm}</div>
        <div>Best Accuracy · {bestAcc.toFixed(2)}</div>
        <div>Best Consistency · {bestCons}</div>
        <div>Average WPM (last 10) · {avgWpmLast10}</div>
        <div>Total Tests · {rows.length}</div>
        <div>Total Time · {formatDuration(totalSeconds)}</div>
        <div>Favorite mode · {favoriteMode(rows)}</div>
      </div>

      {last20Chrono.length > 0 && (
        <ProfileCharts last20Chrono={last20Chrono} personalBestWpm={bestWpm} />
      )}

      <div className="mt-10 text-zinc-600 text-sm mb-2">All-time key pressure</div>
      <div className="space-y-2">
        {HEAT_ROWS.map((row, rIdx) => (
          <div key={rIdx} className="flex gap-[2px]">
            {row.split("").map((k) => {
              const n = merged[k] ?? 0;
              return <div key={k} className={`${heatClass(n)} w-[28px] h-[24px]`} />;
            })}
          </div>
        ))}
      </div>

      {topWeak.length > 0 && (
        <div className="mt-6 text-zinc-400 text-sm">
          You struggled most with:{" "}
          {topWeak.map(([ch, count]) => (
            <span key={ch} className="text-red-500 mr-3">
              {ch} ({count} misses)
            </span>
          ))}
        </div>
      )}

      <div className="mt-10 text-zinc-600 text-sm mb-3">
        Recent tests · Date · Mode · WPM · ACC · Consistency · Tier
      </div>
      <div className="space-y-2 text-sm">
        {rows.slice(0, 10).map((r, i) => (
          <div key={r.id ?? i} className="text-zinc-400">
            {String(r.created_at).slice(0, 10)} · {r.mode} · {r.wpm} ·{" "}
            {Number(r.accuracy).toFixed(2)} · {r.consistency ?? "-"} · [{r.rank_tier}]
          </div>
        ))}
      </div>
    </main>
  );
}
