# 0ms — Terminal Typing for Engineers

> The Holy Grail of typing: zero latency, zero errors.

[live demo badge] [MIT license badge] [built with Next.js badge]

A high-performance typing application built for developers and CS students.
Not lorem ipsum. Real code. Real syntax. Real difficulty.

## Why 0ms

Every typing app tests the same English words. 0ms tests what you actually type:
JavaScript closures, Rust ownership syntax, SQL joins, Bash pipelines.

Three difficulty modes ranked by cognitive load, not arbitrary levels:
- **O(n)** — Common English. The baseline.
- **O(log n)** — Real code snippets from open source projects.
- **O(1)** — High-entropy strings. The Holy Grail.

## Features

- Hidden input engine with zero perceptible latency
- Inter-keystroke variance anti-cheat (statistical, not rule-based)
- Real-time consistency graph showing your typing rhythm
- Net WPM vs Raw WPM — because accuracy is part of speed
- Error heatmap — know exactly which keys slow you down
- Avatar State — triggered at 100 WPM + 97% accuracy
- Dimensional rank tiers: [USER] → [SUDO] → [KERNEL] → [ROOT]
- GitHub OAuth — the dev community's trust anchor
- Real-time leaderboard per mode
- Shadow banning for bots and paste-completers

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 App Router | Server components + edge functions in one |
| State | Zustand | Zero boilerplate, no re-render on hot path |
| Database | Supabase | Postgres + Auth + Realtime, free tier self-sustaining |
| Deployment | Vercel | Edge functions co-located with frontend |

## Self-Hosting

### Prerequisites
- Node.js 18+
- A Supabase project (free tier works)
- A Vercel account (free tier works)
- GitHub OAuth app

### Setup

1. Clone and install
```bash
   git clone https://github.com/yourusername/zeroms
   cd zeroms
   npm install
```

2. Copy environment variables
```bash
   cp .env.example .env.local
   # Fill in your Supabase URL, anon key, service role key
   # Add your GitHub OAuth credentials
```

3. Run the database schema