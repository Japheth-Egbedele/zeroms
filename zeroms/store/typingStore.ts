import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { getPrompt, type TestMode } from "@/lib/wordbanks";
import { calculateSigma, sigmaToConsistency } from "@/lib/statsEngine";

export type TimeMode = 15 | 30 | 60 | 120 | null;
export type WordCountMode = 10 | 25 | 50 | 100 | null;
export type TestStatus = "idle" | "countdown" | "running" | "finished";

export type KeyLogEntry = { char: string; timestamp: number; correct: boolean };
export type WpmPoint = { second: number; wpm: number };

export interface TypingState {
  mode: TestMode;
  timeMode: TimeMode;
  wordCountMode: WordCountMode;

  typingFontPx: number;

  prompt: string;
  chars: string[];
  currentIndex: number;
  typedChars: string[];
  errors: Set<number>;

  status: TestStatus;
  startTime: number | null; // epoch ms (keep consistent everywhere)
  endTime: number | null; // epoch ms
  timeRemaining: number;

  keyLog: KeyLogEntry[];
  wpmTimeline: WpmPoint[];
  lastSnapshotSecond: number;
  isTrusted: boolean;
  countdown: number | null;

  setMode: (mode: TestMode) => void;
  setTimeMode: (mode: Exclude<TimeMode, null>) => void;
  setWordCountMode: (mode: Exclude<WordCountMode, null>) => void;
  setTypingFontPx: (px: number) => void;
  hydrateTypingFont: () => void;

  handleKeystroke: (char: string, timestamp: number, trusted: boolean) => void;
  handleBackspace: () => void;
  tickTimer: () => void;
  beginCountdown: () => void;
  tickCountdown: () => void;
  startTestRun: () => void;
  finishTest: () => void;
  resetTest: () => void;
}

function computeNetWpm(
  typedChars: readonly string[],
  referenceChars: readonly string[],
  startTime: number,
  timestamp: number,
) {
  const elapsedSeconds = Math.max(0.001, (timestamp - startTime) / 1000);
  let correct = 0;
  const n = Math.min(typedChars.length, referenceChars.length);
  for (let i = 0; i < n; i++) if (typedChars[i] === referenceChars[i]) correct++;
  const netWpm = (correct / 5) / (elapsedSeconds / 60);
  return Math.max(0, Math.round(netWpm));
}

function defaults() {
  const prompt = getPrompt("On");
  return {
    mode: "On" as const,
    timeMode: 30 as const,
    wordCountMode: null as WordCountMode,
    typingFontPx: 20,
    prompt,
    chars: prompt.split(""),
    currentIndex: 0,
    typedChars: [],
    errors: new Set<number>(),
    status: "idle" as const,
    startTime: null as number | null,
    endTime: null as number | null,
    timeRemaining: 30,
    keyLog: [],
    wpmTimeline: [],
    lastSnapshotSecond: 0,
    isTrusted: true,
    countdown: null,
  };
}

export const useTypingStore = create<TypingState>((set, get) => ({
  ...defaults(),

  setMode(mode) {
    set({ mode });
    get().resetTest();
  },

  setTimeMode(mode) {
    set({ timeMode: mode, wordCountMode: null });
    get().resetTest();
  },

  setWordCountMode(mode) {
    set({ wordCountMode: mode, timeMode: null });
    get().resetTest();
  },

  setTypingFontPx(px) {
    const v = Math.max(14, Math.min(28, Math.round(px)));
    set({ typingFontPx: v });
    if (typeof window !== "undefined") {
      window.localStorage.setItem("zeroms_typing_font_px", String(v));
    }
  },

  hydrateTypingFont() {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("zeroms_typing_font_px");
    const n = raw ? Number(raw) : NaN;
    if (!Number.isFinite(n)) return;
    const v = Math.max(14, Math.min(28, Math.round(n)));
    set({ typingFontPx: v });
  },

  handleKeystroke(char, timestamp, trusted) {
    const s = get();
    if (s.status !== "running") return;

    const startTime = s.startTime ?? timestamp;
    const status: TestStatus = s.status;
    const expected = s.chars[s.currentIndex] ?? "";
    const correct = char === expected;

    const typedChars = s.typedChars.concat(char);
    const currentIndex = s.currentIndex + 1;

    const errors = new Set(s.errors);
    if (!correct) errors.add(s.currentIndex);

    const keyLog = s.keyLog.concat({ char, timestamp, correct });
    const isTrusted = s.isTrusted && trusted;

    let wpmTimeline = s.wpmTimeline;
    let lastSnapshotSecond = s.lastSnapshotSecond;

    const elapsedSeconds = Math.floor((timestamp - startTime) / 1000);
    if (elapsedSeconds > lastSnapshotSecond) {
      const wpm = computeNetWpm(typedChars, s.chars, startTime, timestamp);
      wpmTimeline = wpmTimeline.concat({ second: elapsedSeconds, wpm });
      lastSnapshotSecond = elapsedSeconds;
    }

    const shouldFinishWordCount =
      s.wordCountMode !== null && currentIndex >= s.chars.length;

    set({
      startTime,
      status,
      typedChars,
      currentIndex,
      errors,
      keyLog,
      isTrusted,
      wpmTimeline,
      lastSnapshotSecond,
    });

    if (shouldFinishWordCount) get().finishTest();
  },

  handleBackspace() {
    const s = get();
    if (s.currentIndex === 0 || s.status !== "running") return;

    const nextIndex = s.currentIndex - 1;
    const typedChars = s.typedChars.slice(0, -1);
    const errors = new Set(s.errors);
    errors.delete(nextIndex);

    set({ currentIndex: nextIndex, typedChars, errors });
  },

  tickTimer() {
    const s = get();
    if (s.status !== "running" || s.timeMode === null) return;

    const next = s.timeRemaining - 1;
    if (next <= 0) {
      set({ timeRemaining: 0 });
      get().finishTest();
    } else {
      set({ timeRemaining: next });
    }
  },

  beginCountdown() {
    const s = get();
    if (s.status !== "idle") return;
    set({ status: "countdown", countdown: 3 });
  },

  tickCountdown() {
    const s = get();
    if (s.status !== "countdown" || s.countdown == null) return;
    if (s.countdown <= 1) {
      get().startTestRun();
      return;
    }
    set({ countdown: s.countdown - 1 });
  },

  startTestRun() {
    const s = get();
    if (s.status !== "countdown") return;
    const prompt = getPrompt(s.mode, s.wordCountMode ?? undefined);
    set({
      prompt,
      chars: prompt.split(""),
      currentIndex: 0,
      typedChars: [],
      errors: new Set<number>(),
      keyLog: [],
      wpmTimeline: [],
      lastSnapshotSecond: 0,
      isTrusted: true,
      countdown: null,
      startTime: Date.now(),
      endTime: null,
      status: "running",
      timeRemaining: s.timeMode ?? 30,
    });
  },

  finishTest() {
    const s = get();
    if (s.status === "finished") return;
    set({ status: "finished", endTime: Date.now() });
  },

  resetTest() {
    const s = get();
    const prompt = getPrompt(s.mode, s.wordCountMode ?? undefined);
    const timeRemaining = s.timeMode ?? 30;

    set({
      mode: s.mode,
      timeMode: s.timeMode,
      wordCountMode: s.wordCountMode,
      prompt,
      chars: prompt.split(""),
      currentIndex: 0,
      typedChars: [],
      errors: new Set<number>(),
      status: "idle",
      startTime: null,
      endTime: null,
      timeRemaining,
      keyLog: [],
      wpmTimeline: [],
      lastSnapshotSecond: 0,
      isTrusted: true,
      countdown: null,
    });
  },
}));

function deriveStats(
  state: Pick<TypingState, "typedChars" | "chars" | "startTime" | "keyLog">,
) {
  const end = Date.now();
  const start = state.startTime ?? end;
  const durationSeconds = Math.max(0.001, (end - start) / 1000);

  const rawWpm = Math.max(0, Math.round((state.typedChars.length / 5) / (durationSeconds / 60)));

  let correct = 0;
  const n = Math.min(state.typedChars.length, state.chars.length);
  for (let i = 0; i < n; i++) if (state.typedChars[i] === state.chars[i]) correct++;
  const netWpm = Math.max(0, Math.round((correct / 5) / (durationSeconds / 60)));

  const accuracy =
    state.typedChars.length === 0 ? 100 : Number(((correct / state.typedChars.length) * 100).toFixed(2));

  const sigma = calculateSigma(state.keyLog);
  const liveConsistency = sigmaToConsistency(sigma);

  return { rawWpm, netWpm, accuracy, liveConsistency };
}

export function useTypingStats() {
  return useTypingStore(
    useShallow((s) =>
      deriveStats({
        typedChars: s.typedChars,
        chars: s.chars,
        startTime: s.startTime,
        keyLog: s.keyLog,
      }),
    ),
  );
}

export function getTierFromNetWpm(netWpm: number) {
  if (netWpm >= 140) return "ROOT" as const;
  if (netWpm >= 120) return "KERNEL" as const;
  if (netWpm >= 90) return "SUDO" as const;
  return "USER" as const;
}

