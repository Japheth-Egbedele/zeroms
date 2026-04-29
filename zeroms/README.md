# 0ms (ZeroMs)

Terminal-style typing benchmark for engineers: real syntax, anti-cheat, live leaderboard.

## Why 0ms

Most typing apps train generic words. 0ms trains what developers actually type:

- `O(n)`: common English baseline
- `O(log n)`: realistic code snippets
- `O(1)`: high-entropy strings and symbols

## Features

- Hidden-input typing engine with low-latency key handling
- Net/Raw WPM, accuracy, consistency, burst WPM
- Per-run timeline graph and keyboard error heatmap
- GitHub OAuth with Supabase Auth
- Guest mode with local history and post-login score claiming
- Server-side anti-cheat checks and shadowed submissions
- Mode-filtered leaderboard and profile analytics
- Admin shadow-review page and keepalive endpoint

## Stack

| Layer   | Choice             | Why                                     |
| ------- | ------------------ | --------------------------------------- |
| App     | Next.js App Router | Server + client composition, API routes |
| State   | Zustand            | Fast, minimal hot-path store            |
| DB/Auth | Supabase           | Postgres + Auth + Realtime              |
| Deploy  | Vercel             | Simple edge/server deployment + cron    |

## Self-hosting

1. Install deps:
   - `npm install`
2. Create env file:
   - `cp .env.example .env.local`
3. Fill all env vars in `.env.local`.
4. In Supabase SQL Editor, run:
   - `docs/schema.sql`
   - If you already ran an older schema, also run `docs/migration_batch2.sql`
5. Start locally:
   - `npm run dev`
6. Build check:
   - `npm run build`

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `NEXT_PUBLIC_ADMIN_HANDLE`

## Anti-cheat

See [`docs/anticheat.md`](docs/anticheat.md).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT — see [`LICENSE`](LICENSE).

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
