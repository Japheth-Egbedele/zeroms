import { createSupabaseServerClient } from "@/lib/supabase-server";
import { LeaderboardRealtime, type LeaderboardRow } from "@/components/LeaderboardRealtime";

export default async function LeaderboardPage(props: {
  searchParams?: Promise<{ mode?: "On" | "Ologn" | "O1" }>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const mode = searchParams.mode ?? "On";

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

  const { data } = await supabase
    .from("leaderboard_public")
    .select("*")
    .eq("mode", mode)
    .order("score", { ascending: false })
    .limit(100);

  const initialRows = (data ?? []) as LeaderboardRow[];

  return (
    <main className="min-h-screen px-8 py-10 font-mono">
      <div className="flex gap-4 text-sm mb-6">
        <a className={mode === "On" ? "text-green-400 underline" : "text-zinc-600"} href="/leaderboard?mode=On">
          [O(n)]
        </a>
        <a
          className={mode === "Ologn" ? "text-green-400 underline" : "text-zinc-600"}
          href="/leaderboard?mode=Ologn"
        >
          [O(log n)]
        </a>
        <a className={mode === "O1" ? "text-green-400 underline" : "text-zinc-600"} href="/leaderboard?mode=O1">
          [O(1)]
        </a>
      </div>

      <div className="text-zinc-600 text-sm mb-3">
        # · Handle · [Tier] · WPM · ACC · Consistency · Score · Mode · Date
      </div>

      <LeaderboardRealtime mode={mode} initialRows={initialRows} />
    </main>
  );
}
