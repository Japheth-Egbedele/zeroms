import { MobileGate } from "@/components/MobileGate";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { HomeClient } from "@/components/HomeClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const handle = user
    ? (
        await supabase
          ?.from("profiles")
          .select("handle")
          .eq("user_id", user.id)
          .maybeSingle()
      )?.data?.handle ?? null
    : null;

  return (
    <MobileGate>
      <main className="min-h-screen flex items-center justify-center px-8">
        <div className="w-full max-w-4xl">
          <HomeClient user={user} handle={handle} />
        </div>
      </main>
    </MobileGate>
  );
}
