"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { syncGuestTokenToCookie } from "@/lib/guestSession";
import { useTypingStore } from "@/store/typingStore";

function GitHubMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2.05c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.78 1.2 1.78 1.2 1.03 1.76 2.7 1.25 3.36.96.1-.74.4-1.25.72-1.54-2.55-.3-5.23-1.28-5.23-5.69 0-1.26.45-2.3 1.2-3.1-.12-.29-.52-1.48.11-3.09 0 0 .98-.31 3.2 1.18a11.2 11.2 0 0 1 5.82 0c2.22-1.5 3.2-1.18 3.2-1.18.63 1.61.23 2.8.11 3.1.75.8 1.2 1.83 1.2 3.09 0 4.42-2.68 5.38-5.24 5.68.41.35.77 1.03.77 2.08v3.08c0 .31.2.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function handleFromMeta(meta: Record<string, unknown>, email?: string | null) {
  const userName = meta.user_name;
  const preferredUsername = meta.preferred_username;
  if (typeof userName === "string" && userName) return userName;
  if (typeof preferredUsername === "string" && preferredUsername) return preferredUsername;
  return email ? email.split("@")[0] : "guest";
}

export function AuthBar(props: {
  initialSignedIn: boolean;
  initialHandle: string | null;
  initialAvatarUrl: string | null;
}) {
  const [signedIn, setSignedIn] = useState(props.initialSignedIn);
  const [handle, setHandle] = useState(props.initialHandle ?? "guest");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(props.initialAvatarUrl ?? null);
  const pathname = usePathname();

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const typingFontPx = useTypingStore((s) => s.typingFontPx);
  const setTypingFontPx = useTypingStore((s) => s.setTypingFontPx);
  const hydrateTypingFont = useTypingStore((s) => s.hydrateTypingFont);

  useEffect(() => {
    hydrateTypingFont();
  }, [hydrateTypingFont]);

  useEffect(() => {
    if (!supabase) return;

    const setFromUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setSignedIn(false);
        setHandle("guest");
        setAvatarUrl(null);
        return;
      }

      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      setSignedIn(true);
      setHandle(handleFromMeta(meta, user.email));
      const v = meta.avatar_url;
      setAvatarUrl(typeof v === "string" && v ? v : null);
    };

    void setFromUser();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void setFromUser();
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function signIn() {
    syncGuestTokenToCookie();
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <div className="fixed top-6 right-8 z-50 text-sm font-mono select-none">
      <div className="inline-flex items-center gap-4">
        {pathname === "/leaderboard" ? (
          <a
            href="/"
            className="text-zinc-600 hover:text-green-400 hover:underline"
          >
            [home]
          </a>
        ) : (
          <a
            href="/leaderboard"
            className="text-zinc-600 hover:text-green-400 hover:underline"
          >
            [leaderboard]
          </a>
        )}

        <div className="inline-flex items-center gap-2 text-zinc-600">
          <span className="hidden sm:inline">font</span>
          <input
            aria-label="typing-font-size"
            type="range"
            min={14}
            max={28}
            value={typingFontPx}
            onChange={(e) => setTypingFontPx(Number(e.target.value))}
            className="w-24 accent-green-400"
          />
          <span className="w-8 text-right tabular-nums">{typingFontPx}</span>
        </div>

        {!signedIn ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-green-400 hover:underline"
            onClick={signIn}
          >
            <GitHubMark />
            <span>connect github</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-3 text-zinc-400">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={handle}
                className="w-6 h-6 rounded-full border border-zinc-700"
              />
            ) : (
              <div className="w-6 h-6 rounded-full border border-zinc-700 grid place-items-center text-[10px]">
                <GitHubMark />
              </div>
            )}
            <span className="text-green-400">@{handle}</span>
            <button
              type="button"
              className="inline-flex items-center gap-1 hover:text-red-400 hover:underline"
              onClick={signOut}
            >
              <GitHubMark />
              <span>disconnect</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

