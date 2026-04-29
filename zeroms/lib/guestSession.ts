import type { TestResult } from "@/lib/statsEngine";

const TOKEN_KEY = "zeroms_guest_token";
const GUEST_COOKIE = "zeroms_guest_token";
const HISTORY_KEY = "zeroms_guest_history";
const NUDGE_KEY = "zeroms_signup_nudge_shown";

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function getOrCreateGuestToken() {
  if (typeof window === "undefined") return null;
  const existing = window.localStorage.getItem(TOKEN_KEY);
  if (existing) return existing;
  const token = crypto.randomUUID();
  window.localStorage.setItem(TOKEN_KEY, token);
  return token;
}

export function syncGuestTokenToCookie() {
  const token = getOrCreateGuestToken();
  if (!token) return;
  document.cookie = `${GUEST_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=31536000; SameSite=Lax`;
}

export function saveGuestTest(result: TestResult) {
  if (typeof window === "undefined") return;
  const cur = getGuestHistory();
  const next = [result, ...cur].slice(0, 10);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export function getGuestHistory(): TestResult[] {
  if (typeof window === "undefined") return [];
  return safeParse<TestResult[]>(window.localStorage.getItem(HISTORY_KEY)) ?? [];
}

export function getGuestBest() {
  const history = getGuestHistory();
  let best = 0;
  for (const h of history) best = Math.max(best, h.netWpm);
  return best;
}

export function getGuestTotals() {
  const history = getGuestHistory();
  return { totalTests: history.length };
}

export function shouldShowSignupNudgeAfterTest(totalGuestTests: number) {
  if (typeof window === "undefined") return false;
  if (window.localStorage.getItem(NUDGE_KEY) === "1") return false;
  return totalGuestTests >= 3;
}

export function dismissSignupNudge() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NUDGE_KEY, "1");
}

