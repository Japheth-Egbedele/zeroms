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
  const cancelCountdown = useTypingStore((s) => s.cancelCountdown);
  const typingFontPx = useTypingStore((s) => s.typingFontPx);
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

      <div className="mt-2 text-[color:var(--foreground)]">
        {(status === "idle" || status === "countdown") && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={
                status === "countdown"
                  ? "text-red-400 hover:underline text-sm"
                  : "text-green-400 hover:underline text-sm"
              }
              onClick={() =>
                status === "countdown" ? cancelCountdown() : beginCountdown()
              }
            >
              {status === "countdown" ? "[stop]" : "[start]"}
            </button>
            <div className="text-xs text-zinc-600">
              press Enter to {status === "countdown" ? "stop" : "start"} (typing is ignored until countdown ends)
            </div>
          </div>
        )}
        {status === "countdown" && (
          <div
            className="text-green-400"
            style={{ fontSize: `${typingFontPx}px`, lineHeight: 1.4 }}
          >
            starting in {countdown}...
          </div>
        )}

        <div className="mt-4">
          <ModeSelector />
          <div className="mt-6 max-h-[52vh] overflow-hidden">
            <CharacterMap />
            <ConsistencyGraph />
          </div>

          <div className="mt-4 text-sm text-zinc-400">
            WPM: {stats.netWpm} | ACC: {stats.accuracy}% | {timeRemaining}s
          </div>

          <TypingEngine />
        </div>
      </div>
    </div>
  );
}

