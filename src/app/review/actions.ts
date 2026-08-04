"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type ReviewState = {
  message: string;
  tone: "idle" | "error" | "success";
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function reviewPattern(
  patternId: string,
  _state: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  if (!hasSupabaseConfig()) {
    return { message: "Connect Supabase before reviewing patterns.", tone: "error" };
  }

  const decision = String(formData.get("decision") ?? "");
  if (!uuidPattern.test(patternId) || !["approved", "rejected"].includes(decision)) {
    return { message: "That review decision is not valid.", tone: "error" };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { message: "Log in with a moderator account first.", tone: "error" };
  }

  const { error } = await supabase.rpc("review_pattern", {
    pattern_id: patternId,
    decision,
  });

  if (error) {
    return { message: error.message, tone: "error" };
  }

  revalidatePath("/review");
  revalidatePath("/patterns");

  return {
    message: decision === "approved" ? "Pattern approved and published." : "Pattern rejected.",
    tone: "success",
  };
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function revalidatePattern(patternId: string) {
  revalidatePath("/review");
  revalidatePath("/patterns");
  revalidatePath(`/patterns/${patternId}`);
  revalidatePath("/");
}

/** Authorisation lives in the RPCs (moderator check, SECURITY DEFINER), the
 *  same shape reviewPattern uses — this only rejects input the database would
 *  have to reject anyway, so the moderator gets a useful message instead of a
 *  constraint violation. */
export async function updatePatternDetails(
  patternId: string,
  _state: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  if (!hasSupabaseConfig()) {
    return { message: "Connect Supabase before editing patterns.", tone: "error" };
  }
  if (!uuidPattern.test(patternId)) {
    return { message: "That pattern reference is not valid.", tone: "error" };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 6);
  const colors = [1, 2, 3].map((n) => String(formData.get(`color${n}`) ?? "").trim());
  const status = String(formData.get("status") ?? "");
  const published = formData.get("published") === "on";
  const scoreRaw = String(formData.get("studioScore") ?? "").trim();

  if (title.length < 2 || title.length > 80) {
    return { message: "Title must be between 2 and 80 characters.", tone: "error" };
  }
  if (description.length < 10 || description.length > 800) {
    return { message: "Description must be between 10 and 800 characters.", tone: "error" };
  }
  if (!colors.every((color) => HEX_COLOR.test(color))) {
    return { message: "Each preview colour must be a #rrggbb hex value.", tone: "error" };
  }
  if (!["pending", "approved", "rejected"].includes(status)) {
    return { message: "Status must be pending, approved or rejected.", tone: "error" };
  }
  const studioScore = scoreRaw === "" ? null : Number(scoreRaw);
  if (studioScore !== null && (!Number.isInteger(studioScore) || studioScore < 0 || studioScore > 100)) {
    return { message: "Studio Score must be a whole number between 0 and 100, or blank.", tone: "error" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_pattern_details", {
    pattern_id: patternId,
    new_title: title,
    new_description: description,
    new_tags: tags,
    new_preview_colors: colors,
    new_studio_score: studioScore,
    new_status: status,
    new_published: published,
  });
  if (error) return { message: error.message, tone: "error" };

  revalidatePattern(patternId);
  return { message: "Pattern updated.", tone: "success" };
}

/** The archive flag rides in the form (like reviewPattern's `decision`) rather
 *  than being bound, so the submit button carries it. */
export async function setPatternArchived(
  patternId: string,
  _state: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  if (!hasSupabaseConfig()) {
    return { message: "Connect Supabase before archiving patterns.", tone: "error" };
  }
  if (!uuidPattern.test(patternId)) {
    return { message: "That pattern reference is not valid.", tone: "error" };
  }
  const archived = String(formData.get("archived") ?? "") === "true";

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_pattern_archived", {
    pattern_id: patternId,
    should_archive: archived,
  });
  if (error) return { message: error.message, tone: "error" };

  revalidatePattern(patternId);
  return {
    message: archived ? "Pattern archived and hidden from the site." : "Pattern restored.",
    tone: "success",
  };
}

/**
 * Irreversible. Removes both storage objects, then the row.
 *
 * Storage is cleared first because the row is the only record of where those
 * objects live — dropping it first would strand them in the bucket with no way
 * to find them again. If an object delete fails the row survives, so the purge
 * can simply be retried; the RPC additionally refuses any pattern that has not
 * been archived, so this cannot run as a first action on live content.
 */
export async function purgePattern(
  patternId: string,
  _state: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  if (!hasSupabaseConfig()) {
    return { message: "Connect Supabase before purging patterns.", tone: "error" };
  }
  if (!uuidPattern.test(patternId)) {
    return { message: "That pattern reference is not valid.", tone: "error" };
  }
  if (String(formData.get("confirm") ?? "") !== "PURGE") {
    return { message: 'Type PURGE to confirm permanent deletion.', tone: "error" };
  }

  const supabase = await createClient();
  const { data: pattern, error: readError } = await supabase
    .from("patterns")
    .select("storage_path,preview_media_path,archived")
    .eq("id", patternId)
    .maybeSingle();
  if (readError) return { message: readError.message, tone: "error" };
  if (!pattern) return { message: "That pattern no longer exists.", tone: "error" };
  if (!pattern.archived) {
    return { message: "Archive the pattern before purging it.", tone: "error" };
  }

  if (pattern.storage_path) {
    const { error } = await supabase.storage.from("pattern-files").remove([pattern.storage_path]);
    if (error) return { message: `Source file not removed: ${error.message}`, tone: "error" };
  }
  if (pattern.preview_media_path) {
    const { error } = await supabase.storage.from("pattern-previews").remove([pattern.preview_media_path]);
    if (error) return { message: `Preview clip not removed: ${error.message}`, tone: "error" };
  }

  const { error } = await supabase.rpc("purge_pattern", { pattern_id: patternId });
  if (error) return { message: error.message, tone: "error" };

  revalidatePattern(patternId);
  return { message: "Pattern purged permanently.", tone: "success" };
}
