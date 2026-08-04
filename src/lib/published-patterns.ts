import "server-only";

import { starterPatterns, type Pattern } from "@/lib/patterns";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type PatternRow = {
  id: string;
  title: string;
  description: string;
  controller: string;
  led_count: number;
  tags: string[] | null;
  preview_colors: unknown;
  likes: number | null;
  downloads: number | null;
  created_at: string;
  storage_path: string;
  preview_media_path: string | null;
  studio_score: number | null;
  profiles: { display_name?: string | null } | { display_name?: string | null }[] | null;
};

function colorsFrom(value: unknown): [string, string, string] {
  return Array.isArray(value) && value.length >= 3
    ? [String(value[0]), String(value[1]), String(value[2])]
    : ["#32e5ff", "#4037ff", "#ef35ed"];
}

export async function getPublishedPatterns(limit?: number): Promise<Pattern[]> {
  if (!hasSupabaseConfig()) return limit ? starterPatterns.slice(0, limit) : starterPatterns;

  const supabase = await createClient();
  let query = supabase
    .from("patterns")
    // studio_score is needed even though no card displays it: the moderator
    // edit form on a card submits every field, so omitting it here would send
    // a blank score and wipe the stored one on the first save.
    .select("id,title,description,controller,led_count,tags,preview_colors,likes,downloads,created_at,storage_path,preview_media_path,studio_score,profiles(display_name)")
    .eq("published", true)
    // Explicit, not just RLS: the select policy still returns an archived row
    // to its owner and to any moderator, so without this an archived pattern
    // would stay visible in the gallery for exactly those people.
    .eq("archived", false)
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error || !data?.length) return limit ? starterPatterns.slice(0, limit) : starterPatterns;

  return Promise.all((data as PatternRow[]).map(async (row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const { data: signed } = await supabase.storage.from("pattern-files").createSignedUrl(row.storage_path, 900);
    const previewMediaUrl = row.preview_media_path
      ? (await supabase.storage.from("pattern-previews").createSignedUrl(row.preview_media_path, 900)).data?.signedUrl
      : undefined;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      author: profile?.display_name ?? "Community maker",
      controller: row.controller,
      ledCount: row.led_count,
      tags: row.tags ?? [],
      colors: colorsFrom(row.preview_colors),
      likes: row.likes ?? 0,
      downloads: row.downloads ?? 0,
      createdAt: row.created_at,
      previewUrl: signed?.signedUrl,
      previewMediaUrl,
      studioScore: row.studio_score ?? undefined,
    };
  }));
}
