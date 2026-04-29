import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { AuthBar } from "@/components/AuthBar";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "0ms",
  description: "Terminal typing for engineers.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const profile = user
    ? (await supabase?.from("profiles").select("handle").eq("user_id", user.id).maybeSingle())
        ?.data ?? null
    : null;

  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const avatarUrl = typeof meta.avatar_url === "string" ? meta.avatar_url : null;
  const initialHandle =
    profile?.handle ??
    (typeof meta.user_name === "string" && meta.user_name
      ? meta.user_name
      : user?.email
        ? user.email.split("@")[0]
        : null);

  return (
    <html lang="en" className={`${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-mono">
        <AuthBar
          initialSignedIn={!!user}
          initialHandle={initialHandle}
          initialAvatarUrl={avatarUrl}
        />
        {children}
      </body>
    </html>
  );
}
