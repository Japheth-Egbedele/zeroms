"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function clearShadowBan(rowId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle")
    .eq("user_id", user.id)
    .maybeSingle();

  const adminHandle = process.env.NEXT_PUBLIC_ADMIN_HANDLE;
  if (!adminHandle || profile?.handle !== adminHandle) return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  await admin.from("leaderboard").update({ is_shadowed: false }).eq("id", rowId);
  revalidatePath("/admin");
}

export async function clearShadowBanForm(formData: FormData) {
  const rowId = formData.get("rowId");
  if (typeof rowId !== "string" || !rowId) return;
  await clearShadowBan(rowId);
}
