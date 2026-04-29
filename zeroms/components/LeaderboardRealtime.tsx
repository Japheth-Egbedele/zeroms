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
        .from("leaderboard_public")
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

  return (
    <div className="space-y-2 text-sm">
      {rows.map((r, i) => (
        <div key={r.id ?? i} className="text-zinc-400">
          {String(i + 1).padStart(2, "0")} ·{" "}
          <a className="text-green-400 hover:underline" href={`/profile/${r.handle}`}>
            {r.handle}
          </a>{" "}
          · <span className={tierClass(r.rank_tier)}>[{r.rank_tier}]</span> · {r.wpm} ·{" "}
          {Number(r.accuracy).toFixed(2)} · {r.consistency ?? "-"} · {r.score ?? "-"} · {r.mode} ·{" "}
          {String(r.created_at).slice(0, 10)}
        </div>
      ))}
    </div>
  );
}
