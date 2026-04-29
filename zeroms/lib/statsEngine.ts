export interface TestResult {
  rawWpm: number;
  netWpm: number;
  accuracy: number;
  consistency: number;
  sigma: number;
  burstWpm: number;
  errorMap: Record<string, number>;
  wpmTimeline: { second: number; wpm: number }[];
  score: number;
  rankTier: "USER" | "SUDO" | "KERNEL" | "ROOT";
  durationSeconds: number;
  mode: "On" | "Ologn" | "O1";
}

export type KeyLogEntry = { char: string; timestamp: number; correct: boolean };

export function calculateWPM(
  typedChars: readonly string[],
  referenceChars: readonly string[],
  durationMs: number,
) {
  const minutes = Math.max(0.001, durationMs / 1000 / 60);
  const rawWpm = (typedChars.length / 5) / minutes;

  let correct = 0;
  const n = Math.min(typedChars.length, referenceChars.length);
  for (let i = 0; i < n; i++) if (typedChars[i] === referenceChars[i]) correct++;
  const netWpm = (correct / 5) / minutes;

  return { rawWpm: Math.round(rawWpm), netWpm: Math.round(netWpm) };
}

export function calculateAccuracy(
  typedChars: readonly string[],
  referenceChars: readonly string[],
) {
  if (typedChars.length === 0) return 100;
  let correct = 0;
  const n = Math.min(typedChars.length, referenceChars.length);
  for (let i = 0; i < n; i++) if (typedChars[i] === referenceChars[i]) correct++;
  return Number(((correct / typedChars.length) * 100).toFixed(2));
}

export function calculateSigma(keyLog: readonly KeyLogEntry[]) {
  if (keyLog.length < 3) return 999;

  const intervals: number[] = [];
  for (let i = 1; i < keyLog.length; i++) {
    intervals.push(keyLog[i]!.timestamp - keyLog[i - 1]!.timestamp);
  }
  if (intervals.length < 2) return 999;

  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance =
    intervals.reduce((sum, x) => sum + (x - mean) * (x - mean), 0) /
    intervals.length;
  return Math.sqrt(variance);
}

export function sigmaToConsistency(sigma: number) {
  const score = Math.max(0, 100 - sigma / 1.5);
  return Math.round(Math.min(100, score));
}

export function calculateBurstWpm(
  wpmTimeline: readonly { second: number; wpm: number }[],
) {
  if (wpmTimeline.length === 0) return 0;
  let best = 0;
  for (let i = 0; i < wpmTimeline.length; i++) {
    const a = wpmTimeline[i]?.wpm ?? 0;
    const b = wpmTimeline[i + 1]?.wpm ?? 0;
    const c = wpmTimeline[i + 2]?.wpm ?? 0;
    const count = Math.min(3, wpmTimeline.length - i);
    const avg = count === 1 ? a : count === 2 ? (a + b) / 2 : (a + b + c) / 3;
    if (avg > best) best = avg;
  }
  return Math.round(best);
}

export function buildErrorMap(
  typedChars: readonly string[],
  referenceChars: readonly string[],
  errors: ReadonlySet<number>,
) {
  const out: Record<string, number> = {};
  errors.forEach((i) => {
    const ch = referenceChars[i];
    if (!ch) return;
    out[ch] = (out[ch] ?? 0) + 1;
  });
  return out;
}

function difficultyMultiplier(mode: "On" | "Ologn" | "O1") {
  switch (mode) {
    case "On":
      return 1.0;
    case "Ologn":
      return 1.5;
    case "O1":
      return 2.5;
  }
}

function tierFromNetWpm(netWpm: number): TestResult["rankTier"] {
  if (netWpm >= 140) return "ROOT";
  if (netWpm >= 120) return "KERNEL";
  if (netWpm >= 90) return "SUDO";
  return "USER";
}

export function deriveTestResult(params: {
  typedChars: readonly string[];
  referenceChars: readonly string[];
  errors: ReadonlySet<number>;
  keyLog: readonly KeyLogEntry[];
  wpmTimeline: readonly { second: number; wpm: number }[];
  startTime: number;
  endTime: number;
  mode: "On" | "Ologn" | "O1";
}): TestResult {
  const durationMs = Math.max(1, params.endTime - params.startTime);
  const durationSeconds = Math.round(durationMs / 1000);

  const { rawWpm, netWpm } = calculateWPM(
    params.typedChars,
    params.referenceChars,
    durationMs,
  );
  const accuracy = calculateAccuracy(params.typedChars, params.referenceChars);
  const sigma = calculateSigma(params.keyLog);
  const consistency = sigmaToConsistency(sigma);
  const burstWpm = calculateBurstWpm(params.wpmTimeline);
  const errorMap = buildErrorMap(
    params.typedChars,
    params.referenceChars,
    params.errors,
  );

  const score =
    (netWpm * Math.pow(accuracy / 100, 2)) * difficultyMultiplier(params.mode);
  const rankTier = tierFromNetWpm(netWpm);

  return {
    rawWpm,
    netWpm,
    accuracy,
    consistency,
    sigma,
    burstWpm,
    errorMap,
    wpmTimeline: [...params.wpmTimeline],
    score: Math.round(score),
    rankTier,
    durationSeconds,
    mode: params.mode,
  };
}

