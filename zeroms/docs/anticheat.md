# Anti-cheat notes

## Inter-Keystroke Variance (IKV)

IKV is the variance in timing between consecutive key presses. Human typing is naturally noisy; synthetic input is often unnaturally uniform. We approximate IKV with the standard deviation of inter-key intervals (`sigma` in ms).

## Why standard deviation works

- **Humans**: micro-pauses, rhythm shifts, and error correction create variance.
- **Bots/macros**: often emit near-constant intervals.
- **Fast humans** can still have low sigma, so sigma is combined with WPM and event trust checks.

## Current checks

1. `UNTRUSTED_EVENT`  
   Browser reports untrusted keyboard events.

2. `LOW_SIGMA`  
   `sigma < 8`, `wpm > 100`, and enough key samples (`keyLog.length > 30`).

3. `IMPOSSIBLE_WPM`  
   `wpm > 250`.

4. `UNIFORM_INTERVALS`  
   For sufficient samples, interval spread `(max - min) < 3ms`.

The API marks suspicious runs as synthetic and sets `is_shadowed = true`.

## Why shadowing beats hard bans

Hard failures leak detection rules and invite adaptation. Shadowing preserves user flow and reduces adversarial feedback loops while still protecting public ranking integrity.

## Tuning strategy

Use `/admin`:
- inspect flagged rows (`sigma`, `wpm`, `flags`)
- clear false positives
- adjust thresholds only after collecting enough genuine high-skill samples

Practical guidance:
- If many clear human runs hit `LOW_SIGMA`, relax sigma threshold upward.
- If obvious bots pass, tighten `UNIFORM_INTERVALS` and/or raise minimum sample requirements.

