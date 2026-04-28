# ZeroMs — Cursor Build Prompts
> Paste each prompt into Cursor in order. Complete and review one phase before starting the next. Use Ctrl+K for small edits, Ctrl+I for multi-file work, Agent mode only for full phases.

---

## PHASE 1 — Auth & Scaffold

```
Create the Supabase auth plumbing for a Next.js 14 App Router project.

1. lib/supabase.ts — browser client using createBrowserClient from @supabase/ssr
2. lib/supabase-server.ts — server client using createServerClient + cookies from next/headers
3. middleware.ts — refresh Supabase session on every request using updateSession
4. app/api/auth/callback/route.ts — exchange OAuth code for session, redirect to /
5. app/layout.tsx — import JetBrains Mono from next/font/google, apply to html element. Set global styles: background #0a0a0a, color #00ff41, font-mono everywhere.
6. app/page.tsx — placeholder that renders <main className="min-h-screen" />

Environment variables to reference (already exist in .env.local):
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

---

## PHASE 2 — Word Banks

```
Create the word bank system in lib/wordbanks/.

lib/wordbanks/mode-On.ts
Export a named array WORDS_ON of 200+ common English words, 3–7 characters each, no punctuation, no apostrophes.

lib/wordbanks/mode-Ologn.ts
Export a named array WORDS_OLOGN of 60+ real code snippet strings. Include JS, Python, Rust, Go, C++, Bash, SQL. Each snippet 40–100 characters. Add a comment above each language group labeling it. Use real syntax, not invented examples.

lib/wordbanks/mode-O1.ts
Export a named array WORDS_O1 of 40+ high-entropy strings mixing symbols, camelCase, numbers, and operators. These should be noticeably harder than code snippets. Examples: Rust generics, complex SQL, chained JS array methods, regex patterns.

lib/wordbanks/index.ts
Export type TestMode = 'On' | 'Ologn' | 'O1'
Export getPrompt(mode: TestMode, wordCount?: number): string
- If wordCount provided: return exactly that many items joined by spaces, shuffled
- If no wordCount: return 200 words shuffled and joined (for time-based modes)
- Never return the same sequence twice in a row (track last seed in module state)
```

---

## PHASE 3 — Zustand Store

```
Create store/typingStore.ts using Zustand (plain create(), no middleware, no immer).

State shape:
- mode: 'On' | 'Ologn' | 'O1' — default 'On'
- timeMode: 15 | 30 | 60 | 120 | null — default 30
- wordCountMode: 10 | 25 | 50 | 100 | null — default null
- prompt: string
- chars: string[] — prompt split into characters
- currentIndex: number — default 0
- typedChars: string[] — default []
- errors: Set<number> — indexes where wrong char was typed
- status: 'idle' | 'running' | 'finished' — default 'idle'
- startTime: number | null
- endTime: number | null
- timeRemaining: number — default 30
- keyLog: { char: string; timestamp: number; correct: boolean }[] — default []
- wpmTimeline: { second: number; wpm: number }[] — default []
- lastSnapshotSecond: number — default 0
- isTrusted: boolean — default true

Actions:
- setMode(mode) — update mode, call resetTest
- setTimeMode(mode) — set timeMode, set wordCountMode to null, call resetTest
- setWordCountMode(mode) — set wordCountMode, set timeMode to null, call resetTest
- handleKeystroke(char, timestamp, trusted):
    If status is idle: set startTime = timestamp, status = running
    Append to keyLog
    If isTrusted is currently true and trusted is false: set isTrusted = false
    Compare char to chars[currentIndex]:
      If correct: push char to typedChars, increment currentIndex
      If wrong: push char to typedChars, add currentIndex to errors, increment currentIndex
    If wordCountMode and currentIndex === chars.length: call finishTest()
    Every time currentSecond > lastSnapshotSecond: calculate netWpm, push to wpmTimeline, update lastSnapshotSecond
- handleBackspace():
    If currentIndex === 0: do nothing
    Decrement currentIndex
    Remove last entry from typedChars
    Remove currentIndex from errors
- tickTimer():
    If status !== running: do nothing
    Decrement timeRemaining by 1
    If timeRemaining <= 0: call finishTest()
- finishTest(): set status = finished, endTime = Date.now()
- resetTest():
    Call getPrompt(mode, wordCountMode ?? undefined) to get new prompt
    Reset all state to defaults
    Set timeRemaining to timeMode ?? 30
    Set status to idle

WPM calculation (use inside handleKeystroke for timeline):
  elapsedSeconds = (timestamp - startTime) / 1000
  correctChars = typedChars filtered where typedChars[i] === chars[i]
  netWpm = Math.round((correctChars.length / 5) / (elapsedSeconds / 60))

Export a selector: useTypingStats() that returns { rawWpm, netWpm, accuracy, liveConsistency } derived from current state without subscribing to the full store.
```

---

## PHASE 4 — Stats Engine

```
Create lib/statsEngine.ts. All functions must be pure — no imports from store or components.

Export interface TestResult {
  rawWpm: number
  netWpm: number
  accuracy: number
  consistency: number
  sigma: number
  burstWpm: number
  errorMap: Record<string, number>
  wpmTimeline: { second: number; wpm: number }[]
  score: number
  rankTier: 'USER' | 'SUDO' | 'KERNEL' | 'ROOT'
  durationSeconds: number
  mode: 'On' | 'Ologn' | 'O1'
}

Export these functions:

calculateWPM(typedChars, referenceChars, durationMs):
  rawWpm = (typedChars.length / 5) / (durationMs / 1000 / 60)
  correctChars = typedChars filtered where typedChars[i] === referenceChars[i]
  netWpm = (correctChars.length / 5) / (durationMs / 1000 / 60)
  Return both, rounded to integer.

calculateAccuracy(typedChars, referenceChars):
  correct / typedChars.length * 100, two decimal places. Return 100 if nothing typed.

calculateSigma(keyLog):
  intervals = differences between consecutive timestamps
  Return standard deviation of intervals in ms. Return 999 if fewer than 3 entries.

sigmaToConsistency(sigma):
  score = Math.max(0, 100 - (sigma / 1.5))
  Return Math.round(Math.min(100, score))

calculateBurstWpm(wpmTimeline):
  Rolling 3-entry average. Return highest window value, rounded.

buildErrorMap(typedChars, referenceChars, errors: Set<number>):
  For each index in errors: count how many times that reference character was missed.
  Return Record<string, number>

deriveTestResult(params: { typedChars, referenceChars, errors, keyLog, wpmTimeline, startTime, endTime, mode }):
  Call all above functions. Compute score: (netWpm * (accuracy/100)^2) * difficultyMultiplier
  difficultyMultiplier: On=1.0, Ologn=1.5, O1=2.5
  rankTier: netWpm >= 140 = ROOT, >= 120 = KERNEL, >= 90 = SUDO, else USER
  Return full TestResult object.
```

---

## PHASE 5 — Anti-Cheat & Score Submission

```
Create lib/anticheat.ts:

Export runAntiCheat({ keyLog, wpm, isTrusted, sigma }):
  flags: string[] = []
  Check 1: if !isTrusted → push 'UNTRUSTED_EVENT'
  Check 2: if sigma < 8 AND wpm > 100 AND keyLog.length > 30 → push 'LOW_SIGMA'
  Check 3: if wpm > 250 → push 'IMPOSSIBLE_WPM'
  Check 4: compute all intervals, if max-min < 3ms and intervals.length > 20 → push 'UNIFORM_INTERVALS'
  Return { isSynthetic: flags.length > 0, flags }

Create app/api/verify-score/route.ts:
  Mark as edge runtime.
  Accept POST body: { userId, guestToken, wpm, rawWpm, accuracy, consistency, burstWpm, score, mode, timeMode, wordCountMode, keyLog, wpmTimeline, errorMap, isTrusted }
  Validate: wpm, accuracy, mode must exist. Return 400 if missing.
  Create Supabase client using SUPABASE_SERVICE_ROLE_KEY (service role, bypasses RLS).
  Import calculateSigma from statsEngine. Calculate sigma server-side from keyLog.
  Run runAntiCheat.
  Insert into leaderboard table with all fields.
  Only store keystroke_log if wpm > 100.
  Set is_shadowed and is_verified based on anticheat result.
  Always return { success: true } — never expose which check failed or whether shadowed.
```

---

## PHASE 6 — Typing Engine Components

```
Create components/TypingEngine.tsx:

Contains a hidden input element:
  position: absolute, opacity: 0, width: 1px, height: 1px, pointerEvents: none
  onKeyDown handler:
    Always call e.preventDefault()
    Tab or Escape → call resetTest() from store
    Backspace → call handleBackspace() from store
    e.key.length === 1 → call handleKeystroke(e.key, e.timeStamp, e.isTrusted)
  onPaste, onCopy, onCut, onDrop → all preventDefault
  autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}

Auto-focus the input:
  On mount
  Whenever store status changes to 'idle'
  When user clicks anywhere on the parent container

Create components/CharacterMap.tsx:
  Receives no props — reads from store directly.
  Renders chars array as individual span elements.
  Use useMemo with dependency array [chars, currentIndex, errors].
  Span states:
    Untyped: text-zinc-600
    Correct (i < currentIndex, not in errors): text-green-400
    Error (i < currentIndex, in errors): text-red-500
    Active cursor (i === currentIndex): blinking 2px green left border via CSS keyframe
  Space characters: render as non-breaking space \u00A0
  Wrap in: div with className "font-mono text-xl leading-loose flex flex-wrap gap-0"

Create components/ConsistencyGraph.tsx:
  Reads last 20 entries from keyLog in store.
  Renders 20 vertical bars (each 3px wide, up to 48px tall).
  Bar height = (interval / maxInterval) * 48, clamped.
  Short bar = fast keystroke, tall bar = slow.
  Use useMemo on last 20 keyLog entries.
  Render below CharacterMap. Small label "rhythm" in zinc-600.
  If fewer than 5 entries: render nothing.
```

---

## PHASE 7 — Terminal UI Shell

```
Create components/ModeSelector.tsx:
  Reads mode, timeMode, wordCountMode from store.
  Row 1 label "difficulty" then buttons: [O(n)] [O(log n)] [O(1)]
  Row 2 label "duration" then buttons: [15s] [30s] [60s] [120s] | [10w] [25w] [50w] [100w]
  Time and word modes are mutually exclusive. Pipe character is a visual separator only.
  Active button: text-green-400 underline. Inactive: text-zinc-600.
  No borders, no backgrounds, no rounded corners on buttons. Pure text.
  On click: call the appropriate store setter.
  Default active: O(n), 30s.

Create components/MobileGate.tsx:
  'use client'
  Import usePathname from next/navigation.
  Detect mobile: typeof window !== 'undefined' && window.innerWidth < 768
  If mobile AND pathname === '/':
    Render ONLY this, nothing else:
      Background black, text red-500, font-mono, full screen centered.
      Line 1: "ERROR: I/O Hardware Mismatch"
      Line 2: "STDIN must be a physical HID."
      Line 3: "Connect a mechanical keyboard and return on Desktop."
  Otherwise: render children (accept children prop).

Create components/TerminalPrompt.tsx:
  'use client'
  Accepts user prop (Supabase User | null).
  Reads status, mode, timeRemaining, and tier from store/props.
  Renders:
    Top line: "[handle]@zeroms:~$" or "guest@zeroms:~$" in the tier prompt color
    ModeSelector component
    CharacterMap component
    ConsistencyGraph component
    Stats line: "WPM: {liveWpm} | ACC: {liveAccuracy}% | {timeRemaining}s" — updates every second
    When status is 'running' and liveWpm > 100 and liveAccuracy > 97 and currentIndex > 20:
      isAvatarState = true
      Add pulsing green box-shadow to the terminal container via CSS animation
      Flash "0ms" text in text-6xl green at center of terminal, fade out after 800ms
      This flash triggers once per test using a useRef to track if already triggered.
  Tier prompt colors: USER=#00ff41, SUDO=#00ffff, KERNEL=#ffff00, ROOT=#ff0040
  Tier visual extras:
    KERNEL: add scanlines overlay (repeating-linear-gradient with 15% opacity black lines every 4px)
    ROOT: permanent red border glow (box-shadow 0 0 20px #ff0040)
```

---

## PHASE 8 — Result Screen

```
Create components/ResultScreen.tsx:
  'use client'
  Accepts: result (TestResult), user (User | null), onReset () => void

  Layout (all flat text on dark background, no cards):

  Row 1 — primary stats, large (text-5xl font-mono):
    Net WPM | Accuracy% | Consistency%
    Numbers animate from 0 to final value over 400ms on mount using useEffect + requestAnimationFrame lerp.

  Row 2 — secondary stats (text-xl text-zinc-400):
    Raw WPM · Burst WPM · {durationSeconds}s

  Rank tier badge:
    Format: [ROOT] / [KERNEL] / [SUDO] / [USER]
    Colors: ROOT=text-red-500, KERNEL=text-yellow-400, SUDO=text-cyan-400, USER=text-green-400

  WPM Timeline — pure SVG line chart, no library:
    Width: 100%, Height: 80px
    X axis: seconds (0 to max), Y axis: WPM (0 to max in dataset + 10)
    Single green polyline connecting all wpmTimeline points
    No labels, no grid, dark background. Just the shape of the session.

  Error Heatmap — simplified QWERTY keyboard:
    Two rows of keys as small rectangles (each ~28px wide, 24px tall, 2px gap)
    Row 1: Q W E R T Y U I O P
    Row 2: A S D F G H J K L
    Row 3: Z X C V B N M
    Color each key from errorMap: not in map=text-zinc-700, 1-2 errors=text-yellow-400, 3+ errors=text-red-500
    Only color keys that appear in the prompt characters.

  Weak char callout:
    Top 3 keys from errorMap by count.
    "Struggled with: [X] [Y] [Z]" in zinc-400, key chars highlighted in red.

  Actions:
    "tab to restart" in zinc-600 small text
    If user authenticated: "Save to Leaderboard" button (calls POST /api/verify-score)
    If not authenticated: "Sign in with GitHub to save" — clicking triggers Supabase GitHub OAuth

  Tier upgrade: if result.rankTier is higher than user's stored rank_tier in profiles:
    Show "[KERNEL] UNLOCKED" in tier color with CSS scale animation
    Update profiles.rank_tier via Supabase client
```

---

## PHASE 9 — Leaderboard & Profile

```
Create app/leaderboard/page.tsx:
  Server component. Fetch from Supabase:
    leaderboard rows where is_shadowed = false
    join with profiles (handle, rank_tier)
    order by score descending, limit 100
  
  Mode filter: tabs [O(n)] [O(log n)] [O(1)] at top — use searchParams for active mode, default On.
  
  Table columns: # · Handle · [Tier] · WPM · ACC · Consistency · Score · Mode · Date
  Tier badges colored by tier (ROOT=red, KERNEL=yellow, SUDO=cyan, USER=green)
  
  Add Supabase Realtime subscription (use client component wrapper) so new rows appear without refresh.
  
  On mobile (width < 768): render the table normally. Do not block leaderboard on mobile.

Create app/profile/[handle]/page.tsx:
  Server component. Fetch:
    profiles row where handle = params.handle
    All leaderboard rows for this user_id, order by created_at desc

  Display:
    Handle + rank tier badge at top
    Stat grid (text only, no cards):
      Best WPM · Best Accuracy · Best Consistency
      Average WPM (last 10) · Total Tests · Total Time ("Xh Ym")
      Favorite mode (most frequent mode in their results)
    
    Last 20 tests as SVG line chart (WPM over time, chronological)
    Add horizontal dashed line at personal best WPM.
    
    Aggregated keyboard heatmap across all sessions:
      Sum all errorMap values across all leaderboard rows
      Render same QWERTY layout as ResultScreen but with all-time data
    
    Top 5 weak characters all-time with miss counts.
    "You struggled most with: X (47 misses) · Y (31 misses) · ..."
    
    Recent tests table: last 10 rows. Date · Mode · WPM · ACC · Consistency · Tier
```

---

## PHASE 10 — Guest Experience

```
Enhance the guest experience using localStorage.

In a client utility lib/guestSession.ts:
  getOrCreateGuestToken(): generate UUID on first call, persist to localStorage 'zeroms_guest_token', return on subsequent calls
  saveGuestTest(result: TestResult): append to localStorage 'zeroms_guest_history', keep last 10 only
  getGuestHistory(): return parsed array or []
  getGuestBest(): return highest wpm from history or 0

In the main page app/page.tsx:
  If user is not authenticated:
    Show below the typing area: "Your best: {bestWpm} WPM · {totalTests} tests" (hide if 0 tests)
  
  After the user's 3rd guest test:
    Show one-time prompt below result screen (not a modal):
    "Sign in with GitHub to save scores to the leaderboard."
    Dismiss on click. Track shown state in localStorage 'zeroms_signup_nudge_shown'.
    Never show again once dismissed.

In app/api/verify-score/route.ts (modify existing):
  Accept guestToken in the POST body. Store it in leaderboard.guest_token column.

Add to app/api/auth/callback/route.ts (modify existing):
  After successful sign-in, if a guest token exists in a cookie or query param:
    Run: UPDATE leaderboard SET user_id = $newUserId WHERE guest_token = $guestToken AND user_id IS NULL
  This claims the guest's previous scores.
```

---

## PHASE 11 — Admin View & Keep-Alive

```
Create app/api/keepalive/route.ts:
  Check Authorization header matches CRON_SECRET env var. Return 401 if not.
  Run lightweight Supabase query: select count(*) from leaderboard limit 1
  Return 200 { ok: true }

Create vercel.json in project root:
{
  "crons": [{ "path": "/api/keepalive", "schedule": "0 0 */4 * *" }]
}

Create app/admin/page.tsx:
  Server component.
  Get authenticated user from Supabase server client.
  If user's handle !== process.env.NEXT_PUBLIC_ADMIN_HANDLE: render "403 Access Denied" only.
  
  Fetch: leaderboard rows where is_shadowed = true, order by created_at desc, limit 50
  Join with profiles (handle) and include sigma, wpm, mode, created_at, guest_token
  
  Render as a simple table: Date · Handle/Guest · WPM · Sigma · Mode · Flags
  For each row: a "Clear Shadow" button that sets is_shadowed = false for that row ID (use server action)
  
  This page exists so you can tune the sigma threshold using real data before public launch.
```

---

## PHASE 12 — GitHub Files

```
Create the following files:

LICENSE — MIT license, current year, your name as copyright holder.

.env.example — copy of .env.local with all values replaced by descriptive placeholders and a one-line comment above each variable explaining what it is and where to get it.

.gitignore — standard Next.js gitignore plus .env.local and .env

docs/schema.sql — the complete Supabase schema including both tables, the trigger function, RLS policies, and all indexes. Format with section comments. Should be paste-and-run ready in the Supabase SQL editor.

docs/anticheat.md — technical document explaining:
  - What Inter-Keystroke Variance (IKV) is
  - Why standard deviation catches bots but not fast humans
  - The four checks and what each catches
  - Why shadow banning beats hard banning
  - How to tune the sigma threshold using the admin view
  Written for a developer audience. Clear and direct.

CONTRIBUTING.md — short contribution guide covering:
  - What contributions are welcome (word banks especially, bug reports, sigma tuning)
  - What to avoid (new dependencies, UI framework changes)
  - PR checklist (tested on Chrome and Firefox, no new deps, word bank PRs need source comments)

README.md — see the structure from the project notes. Include:
  - One-line description
  - Badges (MIT, built with Next.js)
  - Why 0ms (the Big O framing, the CS angle)
  - Full feature list
  - Stack table with "why" column
  - Self-hosting steps (prerequisites, clone, .env, schema, dev server)
  - Anti-cheat section header linking to docs/anticheat.md
  - Contributing and License sections
```

---

## PHASE 13 — Final Wiring

```
Update app/page.tsx to wire everything together:

1. Server component. Get user from Supabase server client.
2. Render MobileGate wrapping everything (it checks route internally).
3. Layout: full height terminal container, centered, max-w-4xl, padding x-8.
4. Top right corner: if user authenticated show "{handle}" in zinc-400 and a "sign out" text link. If not: "sign in with github" text link. No button styling.
5. Render TerminalPrompt passing the user prop.
6. TerminalPrompt renders: ModeSelector → CharacterMap → ConsistencyGraph → stats line.
7. When store status === 'finished':
   - Call deriveTestResult() from statsEngine
   - POST result to /api/verify-score (include guestToken from guestSession if no user)
   - Replace TypingEngine with ResultScreen, passing the result and user
8. Call resetTest() in a useEffect on initial mount to load the first prompt.
9. Tab key anywhere on the page resets (handled inside TypingEngine already — confirm it works).

Ensure the hidden input stays focused throughout: clicking result stats, mode buttons, or anywhere on the page must re-focus the input.
```