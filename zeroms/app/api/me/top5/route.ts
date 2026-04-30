import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "edge";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ rows: [] }, { status: 200 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ rows: [] }, { status: 200 });

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  if (mode !== "On" && mode !== "Ologn" && mode !== "O1") {
    return NextResponse.json({ rows: [] }, { status: 200 });
  }

  const { data } = await supabase
    .from("leaderboard_top5_public")
    .select("created_at, wpm, accuracy, consistency, score, mode, rank_tier, rn")
    .eq("user_id", user.id)
    .eq("mode", mode)
    .lte("rn", 5)
    .order("rn", { ascending: true });

  return NextResponse.json({ rows: data ?? [] }, { status: 200 });
}

