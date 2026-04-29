"use client";

import { useMemo } from "react";
import { useTypingStore } from "@/store/typingStore";

export function ConsistencyGraph() {
  const keyLog = useTypingStore((s) => s.keyLog);

  const intervals = useMemo(() => {
    if (keyLog.length < 5) return null;
    const last = keyLog.slice(-21);
    const ints: number[] = [];
    for (let i = 1; i < last.length; i++) {
      ints.push(last[i]!.timestamp - last[i - 1]!.timestamp);
    }
    const last20 = ints.slice(-20);
    if (last20.length < 5) return null;
    return last20;
  }, [keyLog]);

  if (!intervals) return null;

  const max = Math.max(...intervals);

  return (
    <div className="mt-2">
      <div className="flex items-end gap-[2px]">
        {intervals.map((v, i) => {
          const h = Math.max(2, Math.min(48, (v / Math.max(1, max)) * 48));
          return (
            <div
              key={i}
              className="w-[3px] bg-zinc-600"
              style={{ height: `${h}px` }}
            />
          );
        })}
      </div>
      <div className="mt-1 text-xs text-zinc-600">rhythm</div>
    </div>
  );
}

