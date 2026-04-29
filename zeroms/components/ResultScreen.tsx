"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { TestResult } from "@/lib/statsEngine";
import { dismissSignupNudge, shouldShowSignupNudgeAfterTest } from "@/lib/guestSession";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function useAnimatedNumber(target: number, durationMs = 400) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;
    const from = 0;
    const to = target;

    let raf = 0;
    const tick = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(lerp(from, to, eased)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

function tierColor(tier: TestResult["rankTier"]) {
  switch (tier) {
    case "ROOT":
      return "text-red-500";
    case "KERNEL":
      return "text-yellow-400";
    case "SUDO":
      return "text-cyan-400";
    case "USER":
      return "text-green-400";
  }
}

function buildPolyline(points: { second: number; wpm: number }[], w: number, h: number) {
  if (points.length === 0) return "";
  const maxX = Math.max(...points.map((p) => p.second));
  const maxY = Math.max(10, ...points.map((p) => p.wpm)) + 10;
  return points
    .map((p) => {
      const x = maxX === 0 ? 0 : (p.second / maxX) * w;
      const y = h - (p.wpm / maxY) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function topWeakChars(errorMap: Record<string, number>) {
  return Object.entries(errorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);
}

const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

export function ResultScreen(props: {
  result: TestResult;
  user: User | null;
  onReset: () => void;
  guestTestCount?: number;
  onSignIn?: () => void;
  onSave?: () => void;
}) {
  const net = useAnimatedNumber(props.result.netWpm);
  const acc = useAnimatedNumber(Math.round(props.result.accuracy));
  const cons = useAnimatedNumber(props.result.consistency);

  const polyline = useMemo(
    () => buildPolyline(props.result.wpmTimeline, 800, 80),
    [props.result.wpmTimeline],
  );

  const weak = useMemo(() => topWeakChars(props.result.errorMap), [props.result.errorMap]);

  const showNudge =
    !props.user &&
    shouldShowSignupNudgeAfterTest(props.guestTestCount ?? 0);

  return (
    <div className="font-mono">
      <div className="text-5xl flex flex-wrap gap-x-8 gap-y-2">
        <div>
          <span className="text-zinc-600">Net</span> {net}
        </div>
        <div>
          <span className="text-zinc-600">Acc</span> {acc}%
        </div>
        <div>
          <span className="text-zinc-600">Cons</span> {cons}%
        </div>
      </div>

      <div className="mt-3 text-xl text-zinc-400">
        Raw WPM · {props.result.rawWpm} · Burst WPM · {props.result.burstWpm} · {props.result.durationSeconds}s
      </div>

      <div className={`mt-4 text-xl ${tierColor(props.result.rankTier)}`}>
        [{props.result.rankTier}]
      </div>

      <div className="mt-6">
        <svg width="100%" height="80" viewBox="0 0 800 80" role="img" aria-label="wpm-timeline">
          <polyline
            points={polyline}
            fill="none"
            stroke="#00ff41"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="mt-6 space-y-2">
        {ROWS.map((row, rIdx) => (
          <div key={rIdx} className="flex gap-[2px]">
            {row.split("").map((k) => {
              const n = props.result.errorMap[k] ?? 0;
              const cls =
                n === 0
                  ? "bg-zinc-700"
                  : n <= 2
                    ? "bg-yellow-400"
                    : "bg-red-500";
              return <div key={k} className={`${cls} w-[28px] h-[24px]`} />;
            })}
          </div>
        ))}
      </div>

      {weak.length > 0 && (
        <div className="mt-4 text-zinc-400">
          Struggled with:{" "}
          {weak.map((k) => (
            <span key={k} className="text-red-500 mr-2">
              [{k}]
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 text-sm text-zinc-600">tab to restart</div>

      <div className="mt-2 flex flex-wrap gap-4 text-sm">
        {props.user ? (
          <button
            type="button"
            className="text-green-400 hover:underline"
            onClick={props.onSave}
          >
            Save to Leaderboard
          </button>
        ) : (
          <button
            type="button"
            className="text-green-400 hover:underline"
            onClick={props.onSignIn}
          >
            Sign in with GitHub to save
          </button>
        )}
        <button
          type="button"
          className="text-zinc-600 hover:text-green-400 hover:underline"
          onClick={props.onReset}
        >
          restart
        </button>
      </div>

      {showNudge && (
        <div className="mt-6 text-zinc-400">
          <button
            type="button"
            className="hover:underline"
            onClick={() => dismissSignupNudge()}
          >
            Sign in with GitHub to save scores to the leaderboard.
          </button>
        </div>
      )}
    </div>
  );
}

