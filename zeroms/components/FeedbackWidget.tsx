"use client";

import { useEffect, useMemo, useState } from "react";

const ACCESS_KEY = "2eed9fad-b33d-4846-bdf7-e2cdf65476f1";
const DISMISS_KEY = "zeroms_feedback_dismissed";

function BotIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M11 2a1 1 0 0 0-1 1v1.07A8.002 8.002 0 0 0 4 12v6a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-6a8.002 8.002 0 0 0-6-7.93V3a1 1 0 0 0-1-1h-2Zm1 4a6 6 0 0 1 6 6v6a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-6a6 6 0 0 1 6-6Zm-3 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm-6.2 4.4a1 1 0 0 0-.1 1.4A4.7 4.7 0 0 0 12 19a4.7 4.7 0 0 0 3.3-1.2 1 1 0 0 0-1.3-1.5A2.9 2.9 0 0 1 12 17a2.9 2.9 0 0 1-2-.7 1 1 0 0 0-1.4.1Z" />
    </svg>
  );
}

function clampLen(s: string, max: number) {
  const t = s.trim();
  return t.length > max ? t.slice(0, max) : t;
}

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const canSend = useMemo(() => {
    return (
      clampLen(name, 64).length > 1 &&
      clampLen(email, 128).includes("@") &&
      clampLen(message, 2000).length > 5
    );
  }, [name, email, message]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;

    setStatus("sending");
    try {
      const formData = new FormData();
      formData.append("access_key", ACCESS_KEY);
      formData.append("name", clampLen(name, 64));
      formData.append("email", clampLen(email, 128));
      formData.append("message", clampLen(message, 2000));

      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as { success?: boolean };

      if (data.success) {
        setStatus("sent");
        setName("");
        setEmail("");
        setMessage("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  function dismiss() {
    setDismissed(true);
    setOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, "1");
    }
  }

  if (dismissed) return null;

  return (
    <div className="fixed bottom-6 right-8 z-40 font-mono">
      {!open ? (
        <button
          type="button"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-green-400"
          onClick={() => setOpen(true)}
          aria-label="open-feedback"
        >
          <BotIcon />
          <span className="text-xs text-zinc-600">feedback?</span>
        </button>
      ) : (
        <div className="w-[320px] bg-black/90 text-zinc-300 border border-zinc-800 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm text-green-400">got feedback?</div>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                className="text-zinc-600 hover:text-green-400 hover:underline"
                onClick={() => setOpen(false)}
              >
                close
              </button>
              <button
                type="button"
                className="text-zinc-600 hover:text-red-400 hover:underline"
                onClick={dismiss}
              >
                dismiss
              </button>
            </div>
          </div>

          <div className="mt-1 text-xs text-zinc-600">
            bugs, UX weirdness, feature requests. ship it here.
          </div>

          <form onSubmit={onSubmit} className="mt-3 space-y-2">
            <input
              className="w-full bg-transparent border border-zinc-800 px-2 py-1 text-sm outline-none focus:border-green-400"
              placeholder="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              className="w-full bg-transparent border border-zinc-800 px-2 py-1 text-sm outline-none focus:border-green-400"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <textarea
              className="w-full bg-transparent border border-zinc-800 px-2 py-1 text-sm outline-none focus:border-green-400 min-h-[96px] resize-none"
              placeholder="message (what happened + what you expected)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />

            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={!canSend || status === "sending"}
                className={
                  !canSend || status === "sending"
                    ? "text-zinc-700 cursor-not-allowed"
                    : "text-green-400 hover:underline"
                }
              >
                {status === "sending" ? "sending..." : "send"}
              </button>
              <span className="text-xs text-zinc-600">
                {status === "sent"
                  ? "sent."
                  : status === "error"
                    ? "error."
                    : ""}
              </span>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

