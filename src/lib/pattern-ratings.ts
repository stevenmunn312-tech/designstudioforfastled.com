import "server-only";

import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { PatternRating } from "@/lib/patterns";

// Reads for the community star rating. Writes live in
// src/app/patterns/[id]/actions.ts.
//
// Stats come from the `pattern_rating_stats` view rather than a column on
// `patterns`, so there is no aggregate to keep in sync and no way for a
// cached average to drift from the votes behind it. The view is
// security_invoker, so it only ever returns rows for patterns the caller can
// already see.

/** Patterns with no votes have no row in the view, hence the sparse Map. */
export async function getRatingStats(patternIds: string[]): Promise<Map<string, PatternRating>> {
  const stats = new Map<string, PatternRating>();
  if (!hasSupabaseConfig() || patternIds.length === 0) return stats;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pattern_rating_stats")
    .select("pattern_id,average,votes")
    .in("pattern_id", patternIds);

  if (error || !data) return stats;

  for (const row of data as Array<{ pattern_id: string; average: number | string; votes: number }>) {
    // PostgREST serialises `numeric` as a string to avoid float precision
    // loss, so `average` arrives as "4.33" rather than 4.33.
    const average = Number(row.average);
    if (!Number.isFinite(average)) continue;
    stats.set(row.pattern_id, { average, votes: row.votes });
  }
  return stats;
}

export async function getRatingStat(patternId: string): Promise<PatternRating | undefined> {
  return (await getRatingStats([patternId])).get(patternId);
}

/**
 * The signed-in viewer's own vote, or null if they have not rated this
 * pattern (or are not signed in). Drives the filled state of the star input,
 * so a member sees what they previously submitted.
 */
export async function getViewerRating(patternId: string): Promise<number | null> {
  if (!hasSupabaseConfig()) return null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("pattern_ratings")
    .select("stars")
    .eq("pattern_id", patternId)
    .eq("user_id", user.id)
    .maybeSingle();

  return data?.stars ?? null;
}

/** Whether the viewer is signed in, so the UI can invite a login instead of
 *  presenting a control that would fail at the database. */
export async function viewerIsSignedIn(): Promise<boolean> {
  if (!hasSupabaseConfig()) return false;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return Boolean(user);
}
