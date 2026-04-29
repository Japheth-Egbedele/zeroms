"use client";

import { useTypingStore, type TimeMode, type WordCountMode } from "@/store/typingStore";

function Btn(props: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        props.active
          ? "text-green-400 underline"
          : "text-zinc-600 hover:text-green-400"
      }
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

export function ModeSelector() {
  const mode = useTypingStore((s) => s.mode);
  const timeMode = useTypingStore((s) => s.timeMode);
  const wordCountMode = useTypingStore((s) => s.wordCountMode);
  const setMode = useTypingStore((s) => s.setMode);
  const setTimeMode = useTypingStore((s) => s.setTimeMode);
  const setWordCountMode = useTypingStore((s) => s.setWordCountMode);

  const timeButtons: Exclude<TimeMode, null>[] = [15, 30, 60, 120];
  const wordButtons: Exclude<WordCountMode, null>[] = [10, 25, 50, 100];

  return (
    <div className="text-sm font-mono select-none">
      <div className="flex items-baseline gap-3">
        <span className="text-zinc-600">difficulty</span>
        <div className="flex items-baseline gap-3">
          <Btn active={mode === "On"} onClick={() => setMode("On")}>
            [O(n)]
          </Btn>
          <Btn active={mode === "Ologn"} onClick={() => setMode("Ologn")}>
            [O(log n)]
          </Btn>
          <Btn active={mode === "O1"} onClick={() => setMode("O1")}>
            [O(1)]
          </Btn>
        </div>
      </div>

      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-zinc-600">duration</span>
        <div className="flex items-baseline gap-3 flex-wrap">
          {timeButtons.map((t) => (
            <Btn key={t} active={timeMode === t} onClick={() => setTimeMode(t)}>
              [{t}s]
            </Btn>
          ))}
          <span className="text-zinc-600">|</span>
          {wordButtons.map((w) => (
            <Btn
              key={w}
              active={wordCountMode === w}
              onClick={() => setWordCountMode(w)}
            >
              [{w}w]
            </Btn>
          ))}
        </div>
      </div>
    </div>
  );
}

