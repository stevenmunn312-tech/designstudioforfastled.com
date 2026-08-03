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
