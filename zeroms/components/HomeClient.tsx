"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { deriveTestResult, type TestResult } from "@/lib/statsEngine";
import {
  getOrCreateGuestToken,
  getGuestBest,
  getGuestTotals,
  saveGuestTest,
  syncGuestTokenToCookie,
} from "@/lib/guestSession";
import { useTypingStore } from "@/store/typingStore";
import { TerminalPrompt } from "@/components/TerminalPrompt";
import { ResultScreen } from "@/components/ResultScreen";

export function HomeClient(props: { user: User | null; handle?: string | null }) {
  const resetTest = useTypingStore((s) => s.resetTest);
  const status = useTypingStore((s) => s.status);
  const timeMode = useTypingStore((s) => s.timeMode);
  const wordCountMode = useTypingStore((s) => s.wordCountMode);

  const mode = useTypingStore((s) => s.mode);
  const typedChars = useTypingStore((s) => s.typedChars);
  const referenceChars = useTypingStore((s) => s.chars);
  const errors = useTypingStore((s) => s.errors);
  const keyLog = useTypingStore((s) => s.keyLog);
  const wpmTimeline = useTypingStore((s) => s.wpmTimeline);
  const startTime = useTypingStore((s) => s.startTime);
  const endTime = useTypingStore((s) => s.endTime);
  const isTrusted = useTypingStore((s) => s.isTrusted);
  const tickTimer = useTypingStore((s) => s.tickTimer);
  const tickCountdown = useTypingStore((s) => s.tickCountdown);

  const [result, setResult] = useState<TestResult | null>(null);
  const [guestMeta, setGuestMeta] = useState(() => ({ best: 0, totalTests: 0 }));
  const [uiReady, setUiReady] = useState(false);
  const [top5Open, setTop5Open] = useState(false);
  const [top5Rows, setTop5Rows] = useState<
    Array<{
      rn: number;
      created_at: string;
      wpm: number;
      accuracy: number;
      score: number;
    }>
  >([]);
  const [top5Loading, setTop5Loading] = useState(false);

  const timerRef = useRef<number | null>(null);
  const didSubmitRef = useRef(false);
  const didAutoSaveRef = useRef(false);
  const top5CacheRef = useRef<{ mode: string; rows: typeof top5Rows } | null>(null);

  useEffect(() => {
    resetTest();
    setUiReady(true);
  }, [resetTest]);

  useEffect(() => {
    setGuestMeta({ best: getGuestBest(), ...getGuestTotals() });
  }, []);

  useEffect(() => {
    if (timeMode === null) return;
    if (status !== "running") return;
    timerRef.current = window.setInterval(() => tickTimer(), 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [status, timeMode, tickTimer]);

  useEffect(() => {
    if (status !== "countdown") return;
    const id = window.setInterval(() => tickCountdown(), 1000);
    return () => window.clearInterval(id);
  }, [status, tickCountdown]);

  const computed = useMemo(() => {
    if (status !== "finished") return null;
    if (!startTime || !endTime) return null;
    return deriveTestResult({
      typedChars,
      referenceChars,
      errors,
      keyLog,
      wpmTimeline,
      startTime,
      endTime,
      mode,
    });
  }, [status, startTime, endTime, typedChars, referenceChars, errors, keyLog, wpmTimeline, mode]);

  useEffect(() => {
    if (status !== "finished") {
      didSubmitRef.current = false;
      didAutoSaveRef.current = false;
      setResult(null);
      return;
    }
    if (!computed) return;
    setResult(computed);
    saveGuestTest(computed);
    setGuestMeta({ best: getGuestBest(), ...getGuestTotals() });
  }, [status, computed]);

  useEffect(() => {
    if (status !== "finished") return;
    if (!computed) return;
    if (!props.user) return;
    if (didAutoSaveRef.current) return;

    // Quality gate (balanced)
    if (computed.netWpm < 30) return;
    if (computed.accuracy < 90) return;

    void (async () => {
      try {
        const res = await fetch(`/api/me/top5?mode=${encodeURIComponent(computed.mode)}`);
        const json: unknown = await res.json();
        const rows = (json as { rows?: Array<{ score?: number | null }> }).rows ?? [];

        const currentFifth = rows.length >= 5 ? rows[4]?.score ?? null : null;
        const qualifies = rows.length < 5 || (currentFifth !== null && computed.score > currentFifth);
        if (!qualifies) return;

        didAutoSaveRef.current = true;
        await submitScore(computed);
        top5CacheRef.current = null;
      } catch {
        // ignore network errors; user can still manual-save
      }
    })();
  }, [status, computed, props.user]);

  async function submitScore(r: TestResult) {
    if (didSubmitRef.current) return;
    didSubmitRef.current = true;

    const guestToken = props.user ? null : getOrCreateGuestToken();

    await fetch("/api/verify-score", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId: props.user?.id ?? null,
        guestToken,
        wpm: r.netWpm,
        rawWpm: r.rawWpm,
        accuracy: r.accuracy,
        consistency: r.consistency,
        burstWpm: r.burstWpm,
        score: r.score,
        mode: r.mode,
        timeMode,
        wordCountMode,
        keyLog,
        wpmTimeline,
        errorMap: r.errorMap,
        isTrusted,
        durationSeconds: r.durationSeconds,
      }),
    });
  }

  async function signIn() {
    syncGuestTokenToCookie();
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  }

  const showGuestStats = !props.user && guestMeta.totalTests > 0;
  const showTop5 = !!props.user;

  useEffect(() => {
    if (!showTop5) return;
    if (!top5Open) return;
    if (!uiReady) return;

    const cached = top5CacheRef.current;
    if (cached?.mode === mode && cached.rows.length > 0) {
      setTop5Rows(cached.rows);
      return;
    }

    void (async () => {
      setTop5Loading(true);
      try {
        const res = await fetch(`/api/me/top5?mode=${encodeURIComponent(mode)}`);
        const json: unknown = await res.json();
        const rows = (json as { rows?: typeof top5Rows }).rows ?? [];
        setTop5Rows(rows);
        top5CacheRef.current = { mode, rows };
      } finally {
        setTop5Loading(false);
      }
    })();
  }, [showTop5, top5Open, mode, uiReady]);

  if (result) {
    return (
      <ResultScreen
        result={result}
        user={props.user}
        guestTestCount={guestMeta.totalTests}
        onReset={() => resetTest()}
        onSignIn={() => signIn()}
        onSave={() => submitScore(result)}
      />
    );
  }

  return (
    <div>
      {uiReady ? (
        <TerminalPrompt user={props.user} handle={props.handle ?? null} />
      ) : (
        <div className="text-zinc-600 text-sm">…</div>
      )}
      {showTop5 && (
        <div className="mt-6 text-zinc-400 text-sm">
          <button
            type="button"
            className="hover:text-zinc-200"
            onClick={() => setTop5Open((v) => !v)}
          >
            your best 5 {top5Open ? "▴" : "▾"}
          </button>
          {top5Open && (
            <div className="mt-2 text-zinc-500">
              {top5Loading ? (
                <div>loading…</div>
              ) : top5Rows.length === 0 ? (
                <div>no saved runs yet.</div>
              ) : (
                <div className="space-y-1">
                  {top5Rows.map((r) => (
                    <div key={r.rn} className="font-mono">
                      #{r.rn} · {Math.round(r.wpm)}wpm · {Math.round(r.accuracy)}% ·{" "}
                      {Math.round(r.score)} · {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {showGuestStats && (
        <div className="mt-6 text-zinc-400 text-sm">
          Your best: {guestMeta.best} WPM · {guestMeta.totalTests} tests
        </div>
      )}
    </div>
  );
}

