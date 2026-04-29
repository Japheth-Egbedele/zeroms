"use client";

import { useEffect, useMemo, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { ModeSelector } from "@/components/ModeSelector";
import { CharacterMap } from "@/components/CharacterMap";
import { ConsistencyGraph } from "@/components/ConsistencyGraph";
import { TypingEngine } from "@/components/TypingEngine";
import { useTypingStats, useTypingStore } from "@/store/typingStore";

const TIER_COLORS: Record<"USER" | "SUDO" | "KERNEL" | "ROOT", string> = {
  USER: "#00ff41",
  SUDO: "#00ffff",
  KERNEL: "#ffff00",
  ROOT: "#ff0040",
};

export function TerminalPrompt(props: { user: User | null; handle?: string | null }) {
  const stats = useTypingStats();
  const status = useTypingStore((s) => s.status);
  const countdown = useTypingStore((s) => s.countdown);
  const beginCountdown = useTypingStore((s) => s.beginCountdown);
  const timeRemaining = useTypingStore((s) => s.timeRemaining);
  const currentIndex = useTypingStore((s) => s.currentIndex);

  const tier = useMemo(() => {
    if (stats.netWpm >= 140) return "ROOT" as const;
    if (stats.netWpm >= 120) return "KERNEL" as const;
    if (stats.netWpm >= 90) return "SUDO" as const;
    return "USER" as const;
  }, [stats.netWpm]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const flashedRef = useRef(false);

  const isAvatarState =
    status === "running" &&
    stats.netWpm > 100 &&
    stats.accuracy > 97 &&
    currentIndex > 20;

  useEffect(() => {
    if (status !== "running") flashedRef.current = false;
  }, [status]);

  useEffect(() => {
    if (isAvatarState && !flashedRef.current) {
      flashedRef.current = true;
      containerRef.current?.classList.add("zeroms-avatar-pulse");
      window.setTimeout(() => {
        containerRef.current?.classList.remove("zeroms-avatar-pulse");
      }, 800);
    }
  }, [isAvatarState]);

  const promptColor = TIER_COLORS[tier];
  const handle = props.handle ?? (props.user ? "user" : "guest");

  const scanlines =
    tier === "KERNEL"
      ? "zeroms-scanlines"
      : "";

  const rootGlow = tier === "ROOT" ? "zeroms-root-glow" : "";

  return (
    <div
      ref={containerRef}
      className={`w-full ${scanlines} ${rootGlow}`}
      style={{ color: promptColor }}
    >
      <div className="text-sm">
        {handle}@zeroms:~$ 
      </div>

      <div className="mt-4 text-[color:var(--foreground)]">
        <ModeSelector />
        <div className="mt-6">
          <CharacterMap />
          <ConsistencyGraph />
        </div>

        <div className="mt-4 text-sm text-zinc-400">
          WPM: {stats.netWpm} | ACC: {stats.accuracy}% | {timeRemaining}s
        </div>
        {status === "idle" && (
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              className="text-green-400 hover:underline text-sm"
              onClick={() => beginCountdown()}
            >
              [start]
            </button>
            <div className="text-xs text-zinc-600">
              press Enter to start (typing is ignored until countdown ends)
            </div>
          </div>
        )}
        {status === "countdown" && (
          <div className="mt-2 text-xl text-green-400">
            starting in {countdown}...
          </div>
        )}

        <TypingEngine />
      </div>
    </div>
  );
}

