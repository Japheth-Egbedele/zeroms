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

  const [result, setResult] = useState<TestResult | null>(null);
  const [guestMeta, setGuestMeta] = useState(() => ({ best: 0, totalTests: 0 }));
  const [uiReady, setUiReady] = useState(false);

  const timerRef = useRef<number | null>(null);
  const didSubmitRef = useRef(false);

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
      setResult(null);
      return;
    }
    if (!computed) return;
    setResult(computed);
    saveGuestTest(computed);
    setGuestMeta({ best: getGuestBest(), ...getGuestTotals() });
  }, [status, computed]);

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

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.reload();
  }

  const showGuestStats = !props.user && guestMeta.totalTests > 0;

  if (result) {
    return (
      <div className="relative">
        <div className="absolute top-0 right-0 text-sm">
          {props.user ? (
            <div className="flex items-center gap-3">
              <span className="text-zinc-400">{props.handle ?? "user"}</span>
              <button
                type="button"
                className="text-zinc-400 hover:text-green-400 hover:underline"
                onClick={() => signOut()}
              >
                sign out
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="text-zinc-400 hover:text-green-400 hover:underline"
              onClick={() => signIn()}
            >
              sign in with github
            </button>
          )}
        </div>
        <ResultScreen
          result={result}
          user={props.user}
          guestTestCount={guestMeta.totalTests}
          onReset={() => resetTest()}
          onSignIn={() => signIn()}
          onSave={() => submitScore(result)}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute top-0 right-0 text-sm">
        {props.user ? (
          <div className="flex items-center gap-3">
            <span className="text-zinc-400">{props.handle ?? "user"}</span>
            <button
              type="button"
              className="text-zinc-400 hover:text-green-400 hover:underline"
              onClick={() => signOut()}
            >
              sign out
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="text-zinc-400 hover:text-green-400 hover:underline"
            onClick={() => signIn()}
          >
            sign in with github
          </button>
        )}
      </div>
      {uiReady ? (
        <TerminalPrompt user={props.user} handle={props.handle ?? null} />
      ) : (
        <div className="text-zinc-600 text-sm">…</div>
      )}
      {showGuestStats && (
        <div className="mt-6 text-zinc-400 text-sm">
          Your best: {guestMeta.best} WPM · {guestMeta.totalTests} tests
        </div>
      )}
    </div>
  );
}

