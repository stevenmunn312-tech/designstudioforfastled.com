import "server-only";

import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Whether the current request is from a moderator.
 *
 * Only ever a hint for what to render — every moderator action is authorised
 * again in the database (SECURITY DEFINER functions gated on is_moderator()),
 * so a forged `true` here reveals nothing and does nothing. /review keeps its
 * own inline check because it needs to tell "signed out" apart from "signed in
 * but not a moderator" for its access panel.
 */
export async function isCurrentUserModerator(): Promise<boolean> {
  if (!hasSupabaseConfig()) return false;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("moderators")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return Boolean(data);
}
