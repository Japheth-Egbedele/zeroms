# ZeroMs — Manual Setup Guide
> Everything on this list requires a browser, a dashboard, or a terminal. Cursor cannot do any of this.
> Complete all steps before opening Cursor.

---

## Step 1 — GitHub OAuth Apps (10 mins)

You need two OAuth apps — one for production, one for local dev.

Go to: **github.com → Settings → Developer settings → OAuth Apps → New OAuth App**

**Production app:**
Client ID: [your_github_oauth_client_id]
Client secret: [your_github_oauth_client_secret]
```
Application name:      ZeroMs
Homepage URL:          https://0ms.vercel.app
Authorization callback URL:
  https://[your-supabase-ref].supabase.co/auth/v1/callback
```
*(You'll get the Supabase ref in Step 2. Come back and fill this in.)*

**Local dev app:** 
Client ID: [your_local_github_oauth_client_id]
Client secret: [your_local_github_oauth_client_secret]
```
Application name:      ZeroMs Local
Homepage URL:          http://localhost:3000
Authorization callback URL:
  http://localhost:3000/auth/v1/callback
```

For each app: click **Generate a new client secret**. Save both Client IDs and both Client Secrets somewhere safe. You won't see the secrets again.

---

## Step 2 — Supabase Project (15 mins)

Go to: **supabase.com → New Project**

```
Name:     zeroms
Region:   West EU (Frankfurt) — closest to Nigeria
Password: generate a strong one, save it
```

Wait for the project to finish provisioning (~2 mins).

**Collect your keys:**
Go to **Project Settings → API**. Copy:
```
Project URL          → NEXT_PUBLIC_SUPABASE_URL
https://[your-supabase-ref].supabase.co
anon / public key    → NEXT_PUBLIC_SUPABASE_ANON_KEY
sb_publishable_[your_anon_key]
service_role key     → SUPABASE_SERVICE_ROLE_KEY
sb_secret_[your_service_role_key]
```

**Enable GitHub OAuth:**
Go to **Authentication → Providers → GitHub**. Toggle on. Paste in:
- Client ID (from the production GitHub OAuth app)
- Client Secret (from the production GitHub OAuth app)

Save.

**Set redirect URLs:**
Go to **Authentication → URL Configuration**. Set:
```
Site URL:     https://0ms.vercel.app

Additional Redirect URLs (add both on separate lines):
  https://0ms.vercel.app/auth/callback
  http://localhost:3000/auth/callback
```

**Now go back to Step 1** and fill in the Supabase callback URL in your production GitHub OAuth app. The URL format is:
```
https://[your-supabase-ref].supabase.co/auth/v1/callback
```
Your ref is the subdomain in your project URL.

**Run the database schema:**
Go to **SQL Editor** in Supabase. Paste and run the contents of `docs/schema.sql` from the project. This creates all tables, triggers, RLS policies, and indexes. Run it once. Do not run it again.

---

## Step 3 — Vercel Project (10 mins)

Go to: **vercel.com → Add New Project → Import Git Repository**

Select your zeroms GitHub repo. Framework preset will auto-detect Next.js.

**Before deploying, add environment variables:**
Go to **Settings → Environment Variables**. Add all five for all three environments (Production, Preview, Development):

```
NEXT_PUBLIC_SUPABASE_URL        [your supabase project URL]
NEXT_PUBLIC_SUPABASE_ANON_KEY   [your anon key]
SUPABASE_SERVICE_ROLE_KEY       [your service role key]
CRON_SECRET                     [generate below]
NEXT_PUBLIC_ADMIN_HANDLE        [your GitHub username]
```

**Generate CRON_SECRET:**
Run this in your terminal:
```bash
openssl rand -base64 32
```
Paste the output as the value for CRON_SECRET.

Then deploy. Vercel will pick up `vercel.json` and register the cron job automatically.

---

## Step 4 — Local Machine Setup (10 mins)

Run these commands in order. All in your terminal, not Cursor.

**Create the Next.js project:**
```bash
npx create-next-app@latest zeroms \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"

cd zeroms
```

**Install all dependencies at once:**
```bash
npm install @supabase/supabase-js @supabase/ssr zustand html2canvas
```

**Create all folders:**
```bash
mkdir -p lib/wordbanks store components docs \
  app/api/verify-score \
  app/api/keepalive \
  app/api/auth/callback \
  app/leaderboard \
  "app/profile/[handle]" \
  app/admin
```

**Create all empty files Cursor will fill:**
```bash
touch \
  lib/supabase.ts \
  lib/supabase-server.ts \
  lib/anticheat.ts \
  lib/statsEngine.ts \
  lib/guestSession.ts \
  lib/wordbanks/index.ts \
  lib/wordbanks/mode-On.ts \
  lib/wordbanks/mode-Ologn.ts \
  lib/wordbanks/mode-O1.ts \
  store/typingStore.ts \
  components/TypingEngine.tsx \
  components/CharacterMap.tsx \
  components/TerminalPrompt.tsx \
  components/ResultScreen.tsx \
  components/ConsistencyGraph.tsx \
  components/Leaderboard.tsx \
  components/MobileGate.tsx \
  components/ModeSelector.tsx \
  middleware.ts \
  vercel.json \
  .cursorrules \
  .env.example \
  LICENSE \
  CONTRIBUTING.md \
  docs/schema.sql \
  docs/anticheat.md
```

**Create `.env.local`** (never commit this file):
```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
CRON_SECRET=your_generated_cron_secret_here
NEXT_PUBLIC_ADMIN_HANDLE=your_github_username
EOF
```
Then open the file and replace the placeholder values with your real keys.

**Create `.cursorrules`:**
Paste the entire contents of the `zeroms-cursorrules` document into this file.

**Verify `.gitignore` includes:**
```
.env.local
.env
```
This should already be there from create-next-app but confirm it.

---

## Step 5 — GitHub Repository (5 mins)

Go to **github.com → New Repository**
```
Name:        zeroms
Visibility:  Public
Description: Terminal typing speed app for engineers. O(n) · O(log n) · O(1).
```
Do not initialize with README, .gitignore, or license — you'll push yours.

Then in your terminal:
```bash
git init
git add .
git commit -m "feat: initial scaffold"
git remote add origin https://github.com/yourusername/zeroms.git
git branch -M main
git push -u origin main
```

---

## Checklist Before Opening Cursor

- [ ] Production GitHub OAuth app created with Supabase callback URL
- [ ] Local GitHub OAuth app created with localhost callback URL
- [ ] Supabase project created, GitHub provider enabled
- [ ] Supabase schema SQL has been run (tables, triggers, RLS, indexes)
- [ ] Redirect URLs set in Supabase auth config
- [ ] Vercel project created and linked to GitHub repo
- [ ] All 5 environment variables added in Vercel dashboard
- [ ] `.env.local` filled with real values
- [ ] `.cursorrules` file contains the full rules document
- [ ] All folders and empty files created
- [ ] Initial commit pushed to GitHub

When every box is checked: open Cursor, open the build prompts document, start Phase 1.