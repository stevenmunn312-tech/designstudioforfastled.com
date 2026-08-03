"use server";

import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type UploadState = { message: string; tone: "idle" | "error" | "success" };

const allowedExtensions = ["json", "txt", "ino", "ledmap"];

export async function uploadPattern(_state: UploadState, formData: FormData): Promise<UploadState> {
  if (!hasSupabaseConfig()) {
    return { message: "Connect Supabase before accepting uploads.", tone: "error" };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const controller = String(formData.get("controller") ?? "").trim();
  const ledCount = Number(formData.get("ledCount"));
  const tags = String(formData.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 6);
  const file = formData.get("patternFile");

  if (!title || !description || !controller || !Number.isInteger(ledCount) || ledCount < 1 || ledCount > 100000) {
    return { message: "Complete the required pattern details.", tone: "error" };
  }
  if (!(file instanceof File) || file.size === 0 || file.size > 2 * 1024 * 1024) {
    return { message: "Choose a pattern file no larger than 2 MB.", tone: "error" };
  }
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedExtensions.includes(extension)) {
    return { message: "Use a .json, .txt, .ino, or .ledmap pattern file.", tone: "error" };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { message: "Log in before sharing a pattern.", tone: "error" };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;
  const { error: storageError } = await supabase.storage.from("pattern-files").upload(storagePath, file, {
    contentType: file.type || "text/plain",
    upsert: false,
  });
  if (storageError) return { message: storageError.message, tone: "error" };

  const { error: insertError } = await supabase.from("patterns").insert({
    owner_id: user.id,
    title,
    description,
    controller,
    led_count: ledCount,
    tags,
    storage_path: storagePath,
    preview_colors: ["#61e4ff", "#876bff", "#ff78b7"],
  });

  if (insertError) {
    await supabase.storage.from("pattern-files").remove([storagePath]);
    return { message: insertError.message, tone: "error" };
  }

  return { message: "Pattern received. It is now queued for community review.", tone: "success" };
}
