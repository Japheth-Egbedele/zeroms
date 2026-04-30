import { WORDS_ON } from "./mode-On";
import { WORDS_OLOGN } from "./mode-Ologn";
import { WORDS_O1 } from "./mode-O1";

export type TestMode = "On" | "Ologn" | "O1";

const recentSignatures: string[] = [];
const RECENT_LIMIT = 8;

function pickBank(mode: TestMode): string[] {
  switch (mode) {
    case "On":
      return WORDS_ON;
    case "Ologn":
      return WORDS_OLOGN;
    case "O1":
      return WORDS_O1;
  }
}

function xorshift32(seed: number) {
  let x = seed | 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 0xffffffff;
  };
}

function shuffleCopy<T>(arr: readonly T[], seed: number): T[] {
  const out = arr.slice();
  const rand = xorshift32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function signature(items: readonly string[], count: number) {
  // Small signature: first/last few tokens + count. Good enough for “no immediate repeat”.
  const head = items.slice(0, 5).join("|");
  const tail = items.slice(Math.max(0, count - 5), count).join("|");
  return `${count}:${head}:${tail}`;
}

export function getPrompt(mode: TestMode, wordCount?: number): string {
  const bank = pickBank(mode);
  const count = wordCount ?? 200;

  const baseSeed =
    (Date.now() ^ Math.floor(Math.random() * 2 ** 31)) >>> 0;

  for (let attempt = 0; attempt < 20; attempt++) {
    const shuffled = shuffleCopy(bank, baseSeed + attempt * 101);
    const slice = shuffled.slice(0, Math.min(count, shuffled.length));
    const sig = signature(slice, slice.length);
    if (!recentSignatures.includes(sig)) {
      recentSignatures.unshift(sig);
      if (recentSignatures.length > RECENT_LIMIT) recentSignatures.length = RECENT_LIMIT;
      return slice.join(" ");
    }
  }

  // Fallback: accept repeat if RNG is very unlucky.
  const shuffled = shuffleCopy(bank, baseSeed ^ 0x9e3779b9);
  const slice = shuffled.slice(0, Math.min(count, shuffled.length));
  const sig = signature(slice, slice.length);
  recentSignatures.unshift(sig);
  if (recentSignatures.length > RECENT_LIMIT) recentSignatures.length = RECENT_LIMIT;
  return slice.join(" ");
}

