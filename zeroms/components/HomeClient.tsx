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

function GitHubMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="currentColor"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2.05c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.78 1.2 1.78 1.2 1.03 1.76 2.7 1.25 3.36.96.1-.74.4-1.25.72-1.54-2.55-.3-5.23-1.28-5.23-5.69 0-1.26.45-2.3 1.2-3.1-.12-.29-.52-1.48.11-3.09 0 0 .98-.31 3.2 1.18a11.2 11.2 0 0 1 5.82 0c2.22-1.5 3.2-1.18 3.2-1.18.63 1.61.23 2.8.11 3.1.75.8 1.2 1.83 1.2 3.09 0 4.42-2.68 5.38-5.24 5.68.41.35.77 1.03.77 2.08v3.08c0 .31.2.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function AuthIdentityControl(props: {
  user: User | null;
  handle: string;
  avatarUrl: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  if (!props.user) {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-green-400 hover:underline"
        onClick={props.onSignIn}
      >
        <GitHubMark />
        <span>connect github</span>
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-3 text-zinc-400">
      {props.avatarUrl ? (
        <img
          src={props.avatarUrl}
          alt={props.handle}
          className="w-6 h-6 rounded-full border border-zinc-700"
        />
      ) : (
        <div className="w-6 h-6 rounded-full border border-zinc-700 grid place-items-center text-[10px]">
          <GitHubMark />
        </div>
      )}
      <span className="text-green-400">@{props.handle}</span>
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-red-400 hover:underline"
        onClick={props.onSignOut}
      >
        <GitHubMark />
        <span>disconnect</span>
      </button>
    </div>
  );
}

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
  const fallbackHandle = useMemo(() => {
    if (props.handle) return props.handle;
    const meta = (props.user?.user_metadata ?? {}) as Record<string, unknown>;
    const userName = meta.user_name;
    const preferredUsername = meta.preferred_username;
    if (typeof userName === "string" && userName) return userName;
    if (typeof preferredUsername === "string" && preferredUsername) return preferredUsername;
    const email = props.user?.email;
    return email ? email.split("@")[0] : "guest";
  }, [props.handle, props.user]);
  const avatarUrl = useMemo(() => {
    const meta = (props.user?.user_metadata ?? {}) as Record<string, unknown>;
    const v = meta.avatar_url;
    return typeof v === "string" && v ? v : null;
  }, [props.user]);

  if (result) {
    return (
      <div className="relative">
        <div className="absolute top-0 right-0 text-sm">
          <AuthIdentityControl
            user={props.user}
            handle={fallbackHandle}
            avatarUrl={avatarUrl}
            onSignIn={signIn}
            onSignOut={signOut}
          />
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
        <AuthIdentityControl
          user={props.user}
          handle={fallbackHandle}
          avatarUrl={avatarUrl}
          onSignIn={signIn}
          onSignOut={signOut}
        />
      </div>
      {uiReady ? (
        <TerminalPrompt user={props.user} handle={fallbackHandle} />
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

