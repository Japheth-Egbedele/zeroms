import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateSigma } from "@/lib/statsEngine";
import { runAntiCheat } from "@/lib/anticheat";

export const runtime = "edge";

type Body = {
  userId?: string | null;
  guestToken?: string | null;
  wpm?: number;
  rawWpm?: number;
  accuracy?: number;
  consistency?: number;
  burstWpm?: number;
  score?: number;
  mode?: "On" | "Ologn" | "O1";
  timeMode?: 15 | 30 | 60 | 120 | null;
  wordCountMode?: 10 | 25 | 50 | 100 | null;
  keyLog?: { char: string; timestamp: number; correct: boolean }[];
  wpmTimeline?: { second: number; wpm: number }[];
  errorMap?: Record<string, number>;
  isTrusted?: boolean;
  durationSeconds?: number;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ success: true }, { status: 200 });
  }

  const wpm = body.wpm;
  const accuracy = body.accuracy;
  const mode = body.mode;

  if (typeof wpm !== "number" || typeof accuracy !== "number" || !mode) {
    return NextResponse.json({ success: true }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ success: true }, { status: 200 });
  }

  const keyLog = body.keyLog ?? [];
  const sigma = calculateSigma(keyLog);

  const anti = runAntiCheat({
    keyLog,
    wpm,
    isTrusted: body.isTrusted ?? true,
    sigma,
  });

  const shouldStoreKeyLog = wpm > 100;

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "zeroms-verify-score" } },
  });

  await client.from("leaderboard").insert({
    user_id: body.userId ?? null,
    guest_token: body.guestToken ?? null,
    wpm,
    raw_wpm: body.rawWpm ?? null,
    accuracy,
    consistency: body.consistency ?? null,
    burst_wpm: body.burstWpm ?? null,
    score: body.score ?? null,
    mode,
    time_mode: body.timeMode ?? null,
    word_count_mode: body.wordCountMode ?? null,
    sigma,
    error_map: body.errorMap ?? {},
    wpm_timeline: body.wpmTimeline ?? [],
    keystroke_log: shouldStoreKeyLog ? keyLog : null,
    is_trusted: body.isTrusted ?? true,
    is_shadowed: anti.isSynthetic,
    is_verified: !anti.isSynthetic,
    flags: anti.flags,
    duration_seconds: body.durationSeconds ?? null,
  });

  return NextResponse.json({ success: true }, { status: 200 });
}

