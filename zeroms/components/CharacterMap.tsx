"use client";

import { useMemo } from "react";
import { useTypingStore } from "@/store/typingStore";

export function CharacterMap() {
  const chars = useTypingStore((s) => s.chars);
  const currentIndex = useTypingStore((s) => s.currentIndex);
  const errors = useTypingStore((s) => s.errors);

  const spans = useMemo(() => {
    return chars.map((ch, i) => {
      const isTyped = i < currentIndex;
      const isError = isTyped && errors.has(i);
      const isCorrect = isTyped && !isError;
      const isActive = i === currentIndex;

      const content = ch === " " ? "\u00A0" : ch;

      let cls = "text-zinc-600";
      if (isCorrect) cls = "text-green-400";
      if (isError) cls = "text-red-500";

      if (isActive) cls += " zeroms-cursor";

      return (
        <span key={i} className={cls}>
          {content}
        </span>
      );
    });
  }, [chars, currentIndex, errors]);

  return (
    <div className="font-mono text-xl leading-loose flex flex-wrap gap-0">
      {spans}
    </div>
  );
}

