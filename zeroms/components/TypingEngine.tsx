"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTypingStore } from "@/store/typingStore";

export function TypingEngine() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const status = useTypingStore((s) => s.status);
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

