import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { clearShadowBanForm } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <main className="min-h-screen px-8 py-10 font-mono text-zinc-600 text-sm">
        Missing Supabase env vars.
      </main>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <main className="min-h-screen px-8 py-10 font-mono text-red-500">
        403 Access Denied
      </main>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.handle !== process.env.NEXT_PUBLIC_ADMIN_HANDLE) {
    return (
      <main className="min-h-screen px-8 py-10 font-mono text-red-500">
        403 Access Denied
      </main>
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return (
      <main className="min-h-screen px-8 py-10 font-mono text-zinc-600 text-sm">
        Missing service role key.
      </main>
    );
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: rows } = await admin
    .from("leaderboard")
    .select("id, created_at, user_id, guest_token, wpm, sigma, mode, flags")
    .eq("is_shadowed", true)
    .order("created_at", { ascending: false })
    .limit(50);

  const list = rows ?? [];
  const userIds = [...new Set(list.map((r) => r.user_id).filter(Boolean))] as string[];
  const { data: profiles } =
    userIds.length > 0
      ? await admin.from("profiles").select("user_id, handle").in("user_id", userIds)
      : { data: [] as { user_id: string; handle: string }[] };

  const handleByUser = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p.handle]));

  return (
    <main className="min-h-screen px-8 py-10 font-mono text-sm">
      <div className="text-zinc-600 mb-4">Shadowed submissions (max 50)</div>
      <div className="text-zinc-600 mb-2">Date · Handle/Guest · WPM · Sigma · Mode · Flags</div>
      <div className="space-y-3">
        {list.map((r) => {
          const handle = r.user_id ? handleByUser[r.user_id] ?? r.user_id.slice(0, 8) : r.guest_token ?? "guest";
          return (
            <form
              key={r.id}
              action={clearShadowBanForm}
              className="flex flex-wrap items-baseline gap-4 text-zinc-400"
            >
              <input type="hidden" name="rowId" value={r.id} />
              <span>
                {String(r.created_at).slice(0, 19)} · {String(handle)} · {r.wpm} ·{" "}
                {r.sigma != null ? Number(r.sigma).toFixed(1) : "-"} · {r.mode} ·{" "}
                {(r.flags as string[] | null)?.join(", ") ?? "-"}
              </span>
              <button type="submit" className="text-green-400 hover:underline">
                Clear Shadow
              </button>
            </form>
          );
        })}
      </div>
    </main>
  );
}
