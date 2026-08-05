"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type RatingState = {
  message: string;
  tone: "idle" | "error" | "success";
  /** The viewer's vote after this action, so the control can settle on the
   *  server's answer rather than trusting its own optimistic guess. */
  stars: number | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Record (or change) the signed-in member's star rating for a pattern.
 *
 * Every check here is a courtesy for the UI, not the security boundary — the
 * `pattern_ratings` policies re-authorise this at the database, which is what
 * actually stops a member writing a vote under someone else's id or rating an
 * unpublished pattern. See migration 202608060001.
 */
export async function ratePattern(
  patternId: string,
  stars: number,
): Promise<RatingState> {
  if (!hasSupabaseConfig()) {
    return { message: "Connect Supabase before rating patterns.", tone: "error", stars: null };
  }
  if (!uuidPattern.test(patternId)) {
    return { message: "That pattern is not rateable.", tone: "error", stars: null };
  }
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return { message: "Pick a rating from 1 to 5 stars.", tone: "error", stars: null };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { message: "Log in to rate this pattern.", tone: "error", stars: null };
  }

  const { error } = await supabase
    .from("pattern_ratings")
    // Upsert on the (pattern_id, user_id) primary key: re-rating replaces the
    // member's vote instead of stacking another one.
    .upsert(
      { pattern_id: patternId, user_id: user.id, stars, updated_at: new Date().toISOString() },
      { onConflict: "pattern_id,user_id" },
    );

  if (error) {
    return { message: error.message, tone: "error", stars: null };
  }

  revalidatePath(`/patterns/${patternId}`);
  revalidatePath("/patterns");
  return { message: "Thanks — your rating is in.", tone: "success", stars };
}

/** Withdraw the member's own vote entirely. */
export async function clearPatternRating(patternId: string): Promise<RatingState> {
  if (!hasSupabaseConfig()) {
    return { message: "Connect Supabase before rating patterns.", tone: "error", stars: null };
  }
  if (!uuidPattern.test(patternId)) {
    return { message: "That pattern is not rateable.", tone: "error", stars: null };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { message: "Log in to rate this pattern.", tone: "error", stars: null };
  }

  const { error } = await supabase
    .from("pattern_ratings")
    .delete()
    .eq("pattern_id", patternId)
    .eq("user_id", user.id);

  if (error) {
    return { message: error.message, tone: "error", stars: null };
  }

  revalidatePath(`/patterns/${patternId}`);
  revalidatePath("/patterns");
  return { message: "Rating removed.", tone: "idle", stars: null };
}
