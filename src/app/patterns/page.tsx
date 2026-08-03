import type { Metadata } from "next";
import { PatternGallery } from "@/components/pattern-gallery";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { starterPatterns, type Pattern } from "@/lib/patterns";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pattern gallery",
  description: "Browse FastLED patterns shared by LED makers and creative coders.",
};

export const dynamic = "force-dynamic";

async function getPatterns(): Promise<Pattern[]> {
  if (!hasSupabaseConfig()) return starterPatterns;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patterns")
    .select("id,title,description,controller,led_count,tags,preview_colors,likes,downloads,created_at,profiles(display_name)")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error || !data?.length) return starterPatterns;

  return data.map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const colors = Array.isArray(row.preview_colors) && row.preview_colors.length >= 3
      ? row.preview_colors.slice(0, 3) as [string, string, string]
      : ["#61e4ff", "#876bff", "#ff78b7"] as [string, string, string];
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      author: profile?.display_name ?? "Community maker",
      controller: row.controller,
      ledCount: row.led_count,
      tags: row.tags ?? [],
      colors,
      likes: row.likes ?? 0,
      downloads: row.downloads ?? 0,
      createdAt: row.created_at,
    };
  });
}

export default async function PatternsPage() {
  const patterns = await getPatterns();
  return (
    <>
      <SiteHeader />
      <main className="shell listing-page">
        <div className="page-masthead">
          <p className="eyebrow"><span /> Community gallery</p>
          <h1>Find your<br /><em>next signal.</em></h1>
          <p>Patterns with enough detail to get off the screen and onto your hardware.</p>
        </div>
        <PatternGallery patterns={patterns} />
      </main>
      <SiteFooter />
    </>
  );
}
