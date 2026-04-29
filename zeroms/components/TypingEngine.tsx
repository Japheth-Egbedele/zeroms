"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTypingStore } from "@/store/typingStore";

export function TypingEngine() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const status = useTypingStore((s) => s.status);
  const beginCountdown = useTypingStore((s) => s.beginCountdown);
  const resetTest = useTypingStore((s) => s.resetTest);
  const handleBackspace = useTypingStore((s) => s.handleBackspace);
  const handleKeystroke = useTypingStore((s) => s.handleKeystroke);

  const focus = useMemo(
    () => () => {
      inputRef.current?.focus();
    },
    [],
  );

  useEffect(() => {
    focus();
  }, [focus]);

  useEffect(() => {
    if (status === "idle") focus();
  }, [status, focus]);

  // Reliability: handle keys even if focus is lost.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Avoid interfering with genuine text inputs if you add them later.
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (t as any)?.isContentEditable)
        return;

      if (e.key === "Tab" || e.key === "Escape") {
        e.preventDefault();
        resetTest();
        return;
      }

      if (e.key === "Enter" && status === "idle") {
        e.preventDefault();
        beginCountdown();
        return;
      }

      if (status !== "running") return;

      if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
        return;
      }

      if (e.key.length === 1) {
        e.preventDefault();
        handleKeystroke(e.key, Date.now(), (e as any).isTrusted ?? true);
      }
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true } as any);
  }, [status, beginCountdown, resetTest, handleBackspace, handleKeystroke]);

  return (
    <div
      onMouseDown={() => focus()}
      className="relative"
      aria-label="typing-engine"
    >
      <input
        ref={inputRef}
        className="absolute opacity-0 w-px h-px pointer-events-none"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        onKeyDown={(e) => {
          e.preventDefault();
          if (e.key === "Tab" || e.key === "Escape") {
            resetTest();
            return;
          }
          if (e.key === "Enter" && status === "idle") {
            beginCountdown();
            return;
          }
          if (status !== "running") return;
          if (e.key === "Backspace") {
            handleBackspace();
            return;
          }
          if (e.key.length === 1) {
            handleKeystroke(e.key, Date.now(), e.isTrusted);
          }
        }}
        onPaste={(e) => e.preventDefault()}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
      />
    </div>
  );
}

