import "server-only";

import { starterPatterns, type Pattern } from "@/lib/patterns";
import { getRatingStats } from "@/lib/pattern-ratings";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type PatternRow = {
  id: string;
  title: string;
  description: string;
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

/** Just enough of a pattern to render a step link on the detail page. */
export type PatternLink = { id: string; title: string };

export type PatternNeighbours = {
  previous: PatternLink | null;
  next: PatternLink | null;
  /** 1-based place in the gallery order, or 0 when the pattern is not in it. */
  position: number;
  total: number;
};

/** The gallery order, ids and titles only — no signed URLs, because the detail
 *  page only needs somewhere to point its previous/next arrows. Mirrors the
 *  filters and ordering of getPublishedPatterns so stepping through the
 *  arrows walks the same sequence the gallery shows. */
async function getPatternOrder(): Promise<PatternLink[]> {
  if (!hasSupabaseConfig()) return starterPatterns.map(({ id, title }) => ({ id, title }));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patterns")
    .select("id,title")
    .eq("published", true)
    .eq("archived", false)
    .order("created_at", { ascending: false });

  if (error || !data?.length) return starterPatterns.map(({ id, title }) => ({ id, title }));
  return data as PatternLink[];
}

export async function getPatternNeighbours(id: string): Promise<PatternNeighbours> {
  const ordered = await getPatternOrder();
  const index = ordered.findIndex((pattern) => pattern.id === id);
  if (index === -1) return { previous: null, next: null, position: 0, total: ordered.length };

  return {
    previous: ordered[index - 1] ?? null,
    next: ordered[index + 1] ?? null,
    position: index + 1,
    total: ordered.length,
  };
}

export async function getPublishedPatterns(limit?: number): Promise<Pattern[]> {
  if (!hasSupabaseConfig()) return limit ? starterPatterns.slice(0, limit) : starterPatterns;

  const supabase = await createClient();
  let query = supabase
    .from("patterns")
    // studio_score is needed even though no card displays it: the moderator
    // edit form on a card submits every field, so omitting it here would send
    // a blank score and wipe the stored one on the first save.
    .select("id,title,description,tags,preview_colors,likes,downloads,created_at,storage_path,preview_media_path,studio_score,profiles(display_name)")
    .eq("published", true)
    // Explicit, not just RLS: the select policy still returns an archived row
    // to its owner and to any moderator, so without this an archived pattern
    // would stay visible in the gallery for exactly those people.
    .eq("archived", false)
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error || !data?.length) return limit ? starterPatterns.slice(0, limit) : starterPatterns;

  // One aggregate query for the whole page rather than a per-card lookup.
  const ratings = await getRatingStats((data as PatternRow[]).map((row) => row.id));

  // Signing is batched into two calls total (not one pair per pattern): a
  // gallery-sized fan-out of individual createSignedUrl calls burns through
  // Cloudflare Workers' per-request subrequest budget once the pattern count
  // climbs past a few dozen, and every signing call past that cap silently
  // resolves to no URL rather than throwing — so a gallery works fine in
  // `next dev` and fails wholesale (blank previews, no error anywhere) once
  // deployed.
  const rows = data as PatternRow[];
  const previewMediaPaths = rows
    .map((row) => row.preview_media_path)
    .filter((path): path is string => Boolean(path));

  const [{ data: signedFiles }, { data: signedMedia }] = await Promise.all([
    rows.length
      ? supabase.storage.from("pattern-files").createSignedUrls(rows.map((row) => row.storage_path), 900)
      : Promise.resolve({ data: [] as { path: string | null; signedUrl: string | null }[] }),
    previewMediaPaths.length
      ? supabase.storage.from("pattern-previews").createSignedUrls(previewMediaPaths, 900)
      : Promise.resolve({ data: [] as { path: string | null; signedUrl: string | null }[] }),
  ]);

  const fileUrlByPath = new Map((signedFiles ?? []).map((entry) => [entry.path, entry.signedUrl]));
  const mediaUrlByPath = new Map((signedMedia ?? []).map((entry) => [entry.path, entry.signedUrl]));

  return rows.map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      author: profile?.display_name ?? "Community maker",
      tags: row.tags ?? [],
      colors: colorsFrom(row.preview_colors),
      likes: row.likes ?? 0,
      downloads: row.downloads ?? 0,
      createdAt: row.created_at,
      previewUrl: fileUrlByPath.get(row.storage_path) ?? undefined,
      previewMediaUrl: row.preview_media_path ? mediaUrlByPath.get(row.preview_media_path) ?? undefined : undefined,
      studioScore: row.studio_score ?? undefined,
      rating: ratings.get(row.id),
    };
  });
}
