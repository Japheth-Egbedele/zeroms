"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export type LeaderboardRow = {
  id: string;
  created_at: string;
  user_id: string | null;
  handle: string;
  rank_tier: string;
  mode: string;
  wpm: number;
  accuracy: number;
  consistency: number | null;
  score: number | null;
  duration_seconds?: number | null;
};

function tierClass(tier: string) {
  switch (tier) {
    case "ROOT":
      return "text-red-500";
    case "KERNEL":
      return "text-yellow-400";
    case "SUDO":
      return "text-cyan-400";
    default:
      return "text-green-400";
  }
}

export function LeaderboardRealtime(props: {
  mode: "On" | "Ologn" | "O1";
  initialRows: LeaderboardRow[];
}) {
  const [rows, setRows] = useState<LeaderboardRow[]>(props.initialRows);
  const [supabase] = useState(() => createSupabaseBrowserClient());

  useEffect(() => {
    setRows(props.initialRows);
  }, [props.initialRows]);

  useEffect(() => {
    const sb = supabase;
    if (!sb) return;
    const client: SupabaseClient = sb;

    async function refetch() {
      const { data } = await client
        .from("leaderboard_best_public")
        .select("*")
        .eq("mode", props.mode)
        .order("score", { ascending: false })
        .limit(100);
      if (data) setRows(data as LeaderboardRow[]);
    }

    const channel = client
      .channel(`leaderboard:${props.mode}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leaderboard",
          filter: `mode=eq.${props.mode}`,
        },
        (payload) => {
          const row = payload.new as { is_shadowed?: boolean };
          if (row?.is_shadowed) return;
          void refetch();
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [supabase, props.mode]);

  const cols =
    "grid grid-cols-[40px_minmax(160px,1.2fr)_minmax(72px,0.6fr)_minmax(56px,0.4fr)_minmax(72px,0.5fr)_minmax(88px,0.6fr)_minmax(72px,0.6fr)_minmax(96px,0.8fr)] gap-x-3";

  const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`);

  return (
    <div className="text-sm">
      <div className={`${cols} text-zinc-600 mb-2`}>
        <div>R</div>
        <div>Handle</div>
        <div>Tier</div>
        <div>WPM</div>
        <div>ACC</div>
        <div>CONS</div>
        <div>Score</div>
        <div>Date</div>
      </div>

      <div className="space-y-1">
        {rows.map((r, i) => (
          <div
            key={r.id ?? i}
            className={`${cols} ${i % 2 === 0 ? "text-zinc-300" : "text-zinc-400"}`}
          >
            <div className="text-zinc-600">{medal(i)}</div>
            <div className="truncate">
              <a className="text-green-400 hover:underline" href={`/profile/${r.handle}`}>
                {r.handle}
              </a>
            </div>
            <div className={tierClass(r.rank_tier)}>[{r.rank_tier}]</div>
            <div>{r.wpm}</div>
            <div>{Number(r.accuracy).toFixed(2)}</div>
            <div>{r.consistency ?? "-"}</div>
            <div>{r.score ?? "-"}</div>
            <div className="text-zinc-600">{String(r.created_at).slice(0, 10)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
