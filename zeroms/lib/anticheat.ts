export function runAntiCheat(params: {
  keyLog: { timestamp: number }[];
  wpm: number;
  isTrusted: boolean;
  sigma: number;
}) {
  const flags: string[] = [];

  if (!params.isTrusted) flags.push("UNTRUSTED_EVENT");
  if (params.sigma < 8 && params.wpm > 100 && params.keyLog.length > 30)
    flags.push("LOW_SIGMA");
  if (params.wpm > 250) flags.push("IMPOSSIBLE_WPM");

  const intervals: number[] = [];
  for (let i = 1; i < params.keyLog.length; i++) {
    intervals.push(params.keyLog[i]!.timestamp - params.keyLog[i - 1]!.timestamp);
  }
  if (intervals.length > 20) {
    const min = Math.min(...intervals);
    const max = Math.max(...intervals);
    if (max - min < 3) flags.push("UNIFORM_INTERVALS");
  }

  return { isSynthetic: flags.length > 0, flags };
}

